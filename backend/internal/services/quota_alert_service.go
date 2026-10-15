package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
)

// QuotaAlertService queues and delivers low-credit and package-expiry alerts.
type QuotaAlertService struct {
	db   *sql.DB
	line *LINEMessagingService
}

var (
	lineUserIDPattern           = regexp.MustCompile(`^U[0-9a-f]{32}$`)
	ErrInvalidLINEUserID        = errors.New("invalid LINE user ID")
	ErrLINERecipientUnavailable = errors.New("LINE recipient is not reachable by the configured Official Account")
	thaiTimeZone                = time.FixedZone("ICT", 7*60*60)
	thaiMonths                  = [...]string{"ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."}
)

func thaiExpiryDate(t time.Time) string {
	t = t.In(thaiTimeZone)
	return fmt.Sprintf("%d %s %d เวลา %02d:%02d น.", t.Day(), thaiMonths[t.Month()-1], t.Year()+543, t.Hour(), t.Minute())
}

func expiryReminderDays(expiresAt, now time.Time) int {
	remaining := expiresAt.Sub(now)
	switch {
	case remaining > 6*24*time.Hour && remaining <= 7*24*time.Hour:
		return 7
	case remaining > 2*24*time.Hour && remaining <= 3*24*time.Hour:
		return 3
	case remaining > 0 && remaining <= 24*time.Hour:
		return 1
	default:
		return 0
	}
}

func expiryAlertMessage(shopName string, credits, days int, expiresAt time.Time) string {
	return fmt.Sprintf("SlipSure: ร้านค้า: %s\nเครดิตในแพ็กเกจนี้เหลือ %d เครดิต และจะหมดอายุภายใน %d วัน\nหมดอายุ: %s\nกรุณาใช้เครดิตก่อนหมดอายุ", shopName, credits, days, thaiExpiryDate(expiresAt))
}

func balanceAlertMessage(shopName string, remaining, total int, nearestExpiry sql.NullTime) string {
	if remaining == 0 {
		return fmt.Sprintf("SlipSure: ร้านค้า: %s\nเครดิตคงเหลือ 0 เครดิต\nเครดิตหมดแล้ว กรุณาซื้อแพ็กเกจเพื่อใช้งานต่อ", shopName)
	}
	message := fmt.Sprintf("SlipSure: ร้านค้า: %s\nเครดิตคงเหลือ %d จาก %d เครดิต", shopName, remaining, total)
	if nearestExpiry.Valid {
		message += "\nเครดิตชุดที่ใกล้หมดอายุที่สุด: " + thaiExpiryDate(nearestExpiry.Time)
	}
	return message + "\nกรุณาเติมเครดิตก่อนเครดิตหมด"
}

func NewQuotaAlertService(db *sql.DB, line *LINEMessagingService) *QuotaAlertService {
	return &QuotaAlertService{db: db, line: line}
}

// GetRecipient returns the effective quota alert destination and whether it is overridden.
func (s *QuotaAlertService) GetRecipient(merchantID uuid.UUID) (string, bool, error) {
	var recipient string
	var overridden bool
	err := s.db.QueryRow(`
		SELECT COALESCE(m.quota_alert_recipient_line_user_id, u.line_user_id, ''),
		       m.quota_alert_recipient_line_user_id IS NOT NULL
		FROM merchants m JOIN users u ON u.id = m.owner_id WHERE m.id = $1
	`, merchantID).Scan(&recipient, &overridden)
	return recipient, overridden, err
}

// SetRecipient configures an admin-managed destination without changing the owner's login.
// An empty ID restores delivery to the owner. Recent unsent alerts are retargeted.
func (s *QuotaAlertService) SetRecipient(ctx context.Context, merchantID uuid.UUID, userID string) error {
	userID = strings.TrimSpace(userID)
	if userID != "" {
		if !lineUserIDPattern.MatchString(userID) {
			return ErrInvalidLINEUserID
		}
		status, err := s.line.CheckRecipient(userID)
		if err != nil {
			return fmt.Errorf("check LINE recipient: %w", err)
		}
		if status != http.StatusOK {
			return fmt.Errorf("%w (profile status %d)", ErrLINERecipientUnavailable, status)
		}
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var effective string
	err = tx.QueryRowContext(ctx, `
		UPDATE merchants SET quota_alert_recipient_line_user_id = NULLIF($2, ''),
		                     updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING COALESCE(quota_alert_recipient_line_user_id,
		  (SELECT line_user_id FROM users WHERE id = owner_id), '')
	`, merchantID, userID).Scan(&effective)
	if err != nil {
		return err
	}
	if effective == "" {
		_, err = tx.ExecContext(ctx, `
			UPDATE quota_alerts SET failed_at = CURRENT_TIMESTAMP
			WHERE merchant_id = $1 AND sent_at IS NULL AND failed_at IS NULL
		`, merchantID)
	} else {
		_, err = tx.ExecContext(ctx, `
			UPDATE quota_alerts
			SET recipient_line_user_id = $2, failed_at = NULL,
			    attempts = 0, next_attempt_at = CURRENT_TIMESTAMP
			WHERE merchant_id = $1 AND sent_at IS NULL
			  AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
		`, merchantID, effective)
	}
	if err != nil {
		return err
	}
	return tx.Commit()
}

// Snapshot counts only unexpired packages that still contain usable credits.
func (s *QuotaAlertService) Snapshot(merchantID uuid.UUID) (*models.QuotaStatus, error) {
	status := &models.QuotaStatus{}
	err := s.db.QueryRow(`
		SELECT COALESCE(SUM(credits_total), 0)::int,
		       COALESCE(SUM(credits_remaining), 0)::int
		FROM credit_lots
		WHERE merchant_id = $1 AND credits_remaining > 0
		  AND expires_at > CURRENT_TIMESTAMP
	`, merchantID).Scan(&status.QuotaLimit, &status.Remaining)
	return status, err
}

// QuotaAlertThreshold returns the most urgent newly crossed level, or -1.
func QuotaAlertThreshold(before, after *models.QuotaStatus) int {
	if before == nil || after == nil || before.Remaining <= after.Remaining {
		return -1
	}
	if after.Remaining == 0 {
		return 0
	}
	if after.QuotaLimit <= 0 || before.QuotaLimit != after.QuotaLimit {
		return -1
	}
	for _, threshold := range []int{5, 20} {
		if before.Remaining*100 > after.QuotaLimit*threshold && after.Remaining*100 <= after.QuotaLimit*threshold {
			return threshold
		}
	}
	return -1
}

// QueueThreshold stores an alert once per threshold and newest credit package.
func (s *QuotaAlertService) QueueThreshold(merchantID uuid.UUID, before, after *models.QuotaStatus) error {
	threshold := QuotaAlertThreshold(before, after)
	if threshold < 0 {
		return nil
	}

	var lineUserID, shopName string
	var cycleLotID uuid.UUID
	var nearestExpiry sql.NullTime
	err := s.db.QueryRow(`
		SELECT COALESCE(m.quota_alert_recipient_line_user_id, u.line_user_id), m.shop_name, lot.id,
		       (SELECT MIN(expires_at) FROM credit_lots
		        WHERE merchant_id = m.id AND credits_remaining > 0 AND expires_at > CURRENT_TIMESTAMP)
		FROM merchants m
		JOIN users u ON u.id = m.owner_id
		JOIN LATERAL (
			SELECT id FROM credit_lots
			WHERE merchant_id = m.id
			ORDER BY (expires_at > CURRENT_TIMESTAMP) DESC,
			         started_at DESC, created_at DESC, id DESC
			LIMIT 1
		) lot ON TRUE
		WHERE m.id = $1 AND (
		  m.quota_alert_recipient_line_user_id IS NOT NULL
		  OR (u.line_linked = TRUE AND u.line_user_id IS NOT NULL AND u.line_user_id <> '')
		)
	`, merchantID).Scan(&lineUserID, &shopName, &cycleLotID, &nearestExpiry)
	if errors.Is(err, sql.ErrNoRows) {
		log.Printf("Quota alert skipped for merchant %s: owner has no linked LINE UID or no credit lot", merchantID)
		return nil
	}
	if err != nil {
		return err
	}

	message := balanceAlertMessage(shopName, after.Remaining, after.QuotaLimit, nearestExpiry)
	result, err := s.db.Exec(`
		INSERT INTO quota_alerts
			(merchant_id, cycle_lot_id, kind, threshold, recipient_line_user_id, message)
		VALUES ($1, $2, 'balance', $3, $4, $5)
		ON CONFLICT (merchant_id, cycle_lot_id, kind, threshold) DO NOTHING
	`, merchantID, cycleLotID, threshold, lineUserID, message)
	if err != nil {
		return err
	}
	if inserted, err := result.RowsAffected(); err == nil && inserted > 0 {
		log.Printf("Quota balance alert queued for merchant %s at %d%% (%d credits remaining)", merchantID, threshold, after.Remaining)
	}
	return nil
}

// QueueExpiryReminders queues one reminder per package at 7, 3, and 1 day before expiry.
func (s *QuotaAlertService) QueueExpiryReminders(ctx context.Context) error {
	rows, err := s.db.QueryContext(ctx, `
		SELECT lot.id, m.id, m.shop_name,
		       COALESCE(m.quota_alert_recipient_line_user_id, u.line_user_id),
		       lot.credits_remaining, lot.expires_at
		FROM credit_lots lot
		JOIN merchants m ON m.id = lot.merchant_id
		JOIN users u ON u.id = m.owner_id
		WHERE lot.credits_remaining > 0 AND lot.started_at <= CURRENT_TIMESTAMP
		  AND lot.expires_at > CURRENT_TIMESTAMP
		  AND lot.expires_at <= CURRENT_TIMESTAMP + INTERVAL '7 days'
		  AND (m.quota_alert_recipient_line_user_id IS NOT NULL
		       OR (u.line_linked = TRUE AND u.line_user_id IS NOT NULL AND u.line_user_id <> ''))
	`)
	if err != nil {
		return err
	}
	type reminder struct {
		lotID, merchantID   uuid.UUID
		shopName, recipient string
		credits             int
		expiresAt           time.Time
	}
	var reminders []reminder
	for rows.Next() {
		var item reminder
		if err := rows.Scan(&item.lotID, &item.merchantID, &item.shopName, &item.recipient, &item.credits, &item.expiresAt); err != nil {
			rows.Close()
			return err
		}
		reminders = append(reminders, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()

	for _, item := range reminders {
		days := expiryReminderDays(item.expiresAt, time.Now())
		if days == 0 {
			continue
		}
		_, err := s.db.ExecContext(ctx, `
			INSERT INTO quota_alerts
				(merchant_id, cycle_lot_id, kind, threshold, recipient_line_user_id, message)
			VALUES ($1, $2, 'expiry', $3, $4, $5)
			ON CONFLICT (merchant_id, cycle_lot_id, kind, threshold) DO NOTHING
		`, item.merchantID, item.lotID, days, item.recipient,
			expiryAlertMessage(item.shopName, item.credits, days, item.expiresAt))
		if err != nil {
			return err
		}
	}
	return nil
}

// ReconcileLowBalances catches balances that were already low at startup or
// became low when an unused credit package expired.
func (s *QuotaAlertService) ReconcileLowBalances(ctx context.Context) error {
	rows, err := s.db.QueryContext(ctx, `
		SELECT m.id
		FROM merchants m
		JOIN users u ON u.id = m.owner_id
		WHERE (m.quota_alert_recipient_line_user_id IS NOT NULL
		  OR (u.line_linked = TRUE AND u.line_user_id IS NOT NULL AND u.line_user_id <> ''))
		  AND EXISTS (SELECT 1 FROM credit_lots WHERE merchant_id = m.id)
	`)
	if err != nil {
		return err
	}
	var merchantIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		merchantIDs = append(merchantIDs, id)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()
	log.Printf("Quota balance reconciliation checking %d merchants", len(merchantIDs))

	for _, id := range merchantIDs {
		balance, err := s.Snapshot(id)
		if err != nil {
			log.Printf("Quota alert balance check for merchant %s: %v", id, err)
			continue
		}
		before := &models.QuotaStatus{QuotaLimit: balance.QuotaLimit, Remaining: balance.QuotaLimit}
		if balance.Remaining == 0 {
			before.Remaining = 1
		}
		if err := s.QueueThreshold(id, before, balance); err != nil {
			log.Printf("Quota alert reconciliation for merchant %s: %v", id, err)
		}
	}
	return nil
}

// Start delivers pending alerts in the background without slowing scan requests.
func (s *QuotaAlertService) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		reconcileTicker := time.NewTicker(time.Minute)
		defer reconcileTicker.Stop()
		reconcile := func() {
			if err := s.ReconcileLowBalances(ctx); err != nil {
				log.Printf("Quota balance alert reconciliation: %v", err)
			}
			if err := s.QueueExpiryReminders(ctx); err != nil {
				log.Printf("Quota expiry alert reconciliation: %v", err)
			}
		}
		reconcile()
		for {
			for i := 0; i < 20; i++ {
				processed, err := s.deliverOne(ctx)
				if err != nil {
					log.Printf("Quota alert delivery: %v", err)
					break
				}
				if !processed {
					break
				}
			}
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
			case <-reconcileTicker.C:
				reconcile()
			}
		}
	}()
}

func (s *QuotaAlertService) deliverOne(ctx context.Context) (bool, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	var id, merchantID, cycleLotID uuid.UUID
	var lineUserID, message, kind string
	var attempts, threshold int
	var createdAt time.Time
	err = tx.QueryRowContext(ctx, `
		SELECT id, merchant_id, cycle_lot_id, kind, threshold, recipient_line_user_id, message, attempts, created_at
		FROM quota_alerts
		WHERE sent_at IS NULL AND failed_at IS NULL
		  AND next_attempt_at <= CURRENT_TIMESTAMP
		ORDER BY created_at ASC
		FOR UPDATE SKIP LOCKED
		LIMIT 1
	`).Scan(&id, &merchantID, &cycleLotID, &kind, &threshold, &lineUserID, &message, &attempts, &createdAt)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	stale := time.Since(createdAt) >= 24*time.Hour
	if kind == "expiry" {
		var credits int
		var expiresAt time.Time
		var shopName string
		err = tx.QueryRowContext(ctx, `
			SELECT lot.credits_remaining, lot.expires_at, m.shop_name
			FROM credit_lots lot JOIN merchants m ON m.id = lot.merchant_id
			WHERE lot.id = $1 AND lot.merchant_id = $2
		`, cycleLotID, merchantID).Scan(&credits, &expiresAt, &shopName)
		if err == nil {
			stale = stale || credits <= 0 || expiryReminderDays(expiresAt, time.Now()) != threshold
			if !stale {
				message = expiryAlertMessage(shopName, credits, threshold, expiresAt)
			}
		}
	} else {
		var currentCycle uuid.UUID
		err = tx.QueryRowContext(ctx, `
			SELECT id FROM credit_lots WHERE merchant_id = $1
			ORDER BY (expires_at > CURRENT_TIMESTAMP) DESC,
			         started_at DESC, created_at DESC, id DESC LIMIT 1
		`, merchantID).Scan(&currentCycle)
		stale = stale || (err == nil && currentCycle != cycleLotID)
		if err == nil && !stale {
			var shopName string
			var total, remaining int
			var nearestExpiry sql.NullTime
			err = tx.QueryRowContext(ctx, `
				SELECT m.shop_name, COALESCE(SUM(lot.credits_total), 0)::int,
				       COALESCE(SUM(lot.credits_remaining), 0)::int, MIN(lot.expires_at)
				FROM merchants m
				LEFT JOIN credit_lots lot ON lot.merchant_id = m.id
				  AND lot.credits_remaining > 0 AND lot.expires_at > CURRENT_TIMESTAMP
				WHERE m.id = $1
				GROUP BY m.id, m.shop_name
			`, merchantID).Scan(&shopName, &total, &remaining, &nearestExpiry)
			if err == nil {
				message = balanceAlertMessage(shopName, remaining, total, nearestExpiry)
			}
		}
	}
	if errors.Is(err, sql.ErrNoRows) || stale {
		_, err = tx.ExecContext(ctx, "UPDATE quota_alerts SET failed_at = CURRENT_TIMESTAMP WHERE id = $1", id)
		if err != nil {
			return false, err
		}
		return true, tx.Commit()
	}
	if err != nil {
		return false, err
	}
	var moreUrgent bool
	if kind == "balance" {
		if err := tx.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM quota_alerts
			WHERE merchant_id = $1 AND cycle_lot_id = $2 AND kind = 'balance' AND threshold < $3
			  AND failed_at IS NULL
		)
	`, merchantID, cycleLotID, threshold).Scan(&moreUrgent); err != nil {
			return false, err
		}
	}
	if moreUrgent {
		if _, err := tx.ExecContext(ctx, "UPDATE quota_alerts SET failed_at = CURRENT_TIMESTAMP WHERE id = $1", id); err != nil {
			return false, err
		}
		return true, tx.Commit()
	}

	pushErr := s.line.PushMessageWithRetryKey(lineUserID, []LINEMessage{BuildTextMessage(message)}, id.String())
	if pushErr == nil {
		_, err = tx.ExecContext(ctx, "UPDATE quota_alerts SET sent_at = CURRENT_TIMESTAMP, message = $2, attempts = attempts + 1 WHERE id = $1", id, message)
	} else {
		var apiErr *LINEAPIError
		if errors.As(pushErr, &apiErr) && apiErr.StatusCode == http.StatusBadRequest {
			profileStatus, profileErr := s.line.CheckRecipient(lineUserID)
			validationErr := s.line.ValidatePushMessage([]LINEMessage{BuildTextMessage(message)})
			log.Printf("Quota alert %s LINE diagnostic: recipient profile status=%d, profile error=%v, message validation error=%v",
				id, profileStatus, profileErr, validationErr)
		}
		permanent := errors.As(pushErr, &apiErr) && apiErr.StatusCode >= http.StatusBadRequest &&
			apiErr.StatusCode < http.StatusInternalServerError && apiErr.StatusCode != http.StatusTooManyRequests
		if permanent {
			_, err = tx.ExecContext(ctx, "UPDATE quota_alerts SET failed_at = CURRENT_TIMESTAMP, attempts = attempts + 1 WHERE id = $1", id)
		} else {
			delay := time.Minute << min(attempts, 6)
			_, err = tx.ExecContext(ctx, "UPDATE quota_alerts SET attempts = attempts + 1, next_attempt_at = $2 WHERE id = $1", id, time.Now().Add(delay))
		}
		log.Printf("Quota alert %s push failed: %v", id, pushErr)
	}
	if err != nil {
		return false, err
	}
	return true, tx.Commit()
}
