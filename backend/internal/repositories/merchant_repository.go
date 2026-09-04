package repositories

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
)

// MerchantRepository defines the interface for merchant data operations
type MerchantRepository interface {
	// Merchant profile operations
	CreateMerchant(merchant *models.MerchantProfile) error
	FindByID(id uuid.UUID) (*models.MerchantProfile, error)
	FindByOwnerID(ownerID uuid.UUID) (*models.MerchantProfile, error)
	UpdateMerchant(merchant *models.MerchantProfile) error
	UpdateLogo(merchantID uuid.UUID, logoURL string) error
	HasUsedFreePlan(merchantID uuid.UUID) (bool, error)
	MarkFreePlanUsed(merchantID uuid.UUID) error
	ListAdminMerchants(status string, search string, startDate *time.Time, endDate *time.Time, limit int, offset int) ([]models.AdminMerchantListItem, int, error)

	// Subscription operations
	CreateSubscription(subscription *models.Subscription) error
	FindByMerchantID(merchantID uuid.UUID) (*models.Subscription, error)
	UpdateSubscription(subscription *models.Subscription) error
	CancelSubscription(merchantID uuid.UUID, reason string) error
	CreatePaymentLog(payment *models.PaymentLog) error
	ListPaymentLogs(status string, startDate *time.Time, endDate *time.Time, limit, offset int) ([]models.PaymentLog, int, error)
	ListPaymentLogsByMerchant(merchantID uuid.UUID, limit int) ([]models.PaymentLog, error)
	GetAdminMerchantUsage(merchantID uuid.UUID, periodStart time.Time, quota int, remaining int, resetDate time.Time) (models.AdminMerchantUsage, error)
	GetAdminMerchantBillingSummary(merchantID uuid.UUID) (models.AdminMerchantBillingSummary, error)
	GetAdminAnalyticsDashboard() (models.AdminAnalyticsDashboard, error)
	GetAdminRevenueAnalytics(period string) (models.AdminRevenueAnalytics, error)
	GetAdminMerchantPerformance() (models.AdminMerchantPerformanceAnalytics, error)
	GetMerchantAnalyticsDashboard(merchantID uuid.UUID) (models.MerchantAnalyticsDashboard, error)
	GetMerchantAnalyticsUsage(merchantID uuid.UUID, days int) (models.MerchantAnalyticsUsage, error)
	ListMerchantAnalyticsExport(merchantID uuid.UUID, startDate, endDate time.Time) ([]models.MerchantAnalyticsExportRow, error)
	RecordLineBotClient(merchantID uuid.UUID, lineUserID string, active bool) error
	GetLineBotClientStats(merchantID uuid.UUID) (total int, newClients int, previousClients int, err error)

	// Plan operations
	GetAllPlans() ([]models.SubscriptionPlan, error)
	GetPlanByID(planID string) (*models.SubscriptionPlan, error)

	// Settings operations
	GetSettings(merchantID uuid.UUID) (*models.MerchantSettings, error)
	UpdateSettings(settings *models.MerchantSettings) error

	// Quota operations
	GetQuotaStatus(merchantID uuid.UUID) (*models.QuotaStatus, error)
	UpdateUsageCounter(merchantID uuid.UUID, year, month int, increment int) error
	ResetUsageCounter(merchantID uuid.UUID, year, month int) error

	// LINE webhook operations
	GetLINEWebhookConfig(merchantID uuid.UUID) (*models.LINEWebhookConfig, error)
	UpdateLINEWebhookConfig(merchantID uuid.UUID, lineChannelID, encryptedChannelSecret, encryptedAccessToken, webhookRefID string) error
	DeleteLINEWebhookConfig(merchantID uuid.UUID) error
	GetLINECredentials(merchantID uuid.UUID) (channelID, encryptedSecret, encryptedToken, webhookRefID string, err error)
	FindByWebhookReferenceID(webhookRefID string) (*models.MerchantProfile, error)
}

type merchantRepository struct {
	db *sql.DB
}

// NewMerchantRepository creates a new merchant repository instance
func NewMerchantRepository(db *sql.DB) MerchantRepository {
	return &merchantRepository{db: db}
}

// ListAdminMerchants retrieves merchant summaries for backoffice.
func (r *merchantRepository) ListAdminMerchants(status string, search string, startDate *time.Time, endDate *time.Time, limit int, offset int) ([]models.AdminMerchantListItem, int, error) {
	where, args := buildAdminMerchantWhere(status, search, startDate, endDate)

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM merchants m
		JOIN users owner ON owner.id = m.owner_id
		LEFT JOIN subscriptions s ON s.merchant_id = m.id
		LEFT JOIN subscription_plans p ON p.id = s.plan_id
		%s
	`, where)

	var total int
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limitPosition := len(args) + 1
	offsetPosition := len(args) + 2
	query := fmt.Sprintf(`
		SELECT
			m.id,
			m.shop_name,
			owner.email,
			owner.name,
			m.is_active,
			COALESCE(s.status::text, 'none') AS subscription_status,
			COALESCE(p.name, 'No plan') AS plan,
			COALESCE((SELECT SUM(scan_count)::int FROM usage_counters uc WHERE uc.merchant_id = m.id), 0) AS total_scans,
			COALESCE((SELECT COUNT(*)::int FROM transactions t WHERE t.merchant_id = m.id), 0) AS total_transactions,
			(lwc.merchant_id IS NOT NULL) AS line_connected,
			m.created_at
		FROM merchants m
		JOIN users owner ON owner.id = m.owner_id
		LEFT JOIN subscriptions s ON s.merchant_id = m.id
		LEFT JOIN subscription_plans p ON p.id = s.plan_id
		LEFT JOIN line_webhook_configs lwc ON lwc.merchant_id = m.id
		%s
		ORDER BY m.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, limitPosition, offsetPosition)

	args = append(args, limit, offset)
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	merchants := make([]models.AdminMerchantListItem, 0)
	for rows.Next() {
		var item models.AdminMerchantListItem
		if err := rows.Scan(
			&item.ID,
			&item.ShopName,
			&item.OwnerEmail,
			&item.OwnerName,
			&item.IsActive,
			&item.SubscriptionStatus,
			&item.Plan,
			&item.TotalScans,
			&item.TotalTransactions,
			&item.LineConnected,
			&item.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		merchants = append(merchants, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return merchants, total, nil
}

func buildAdminMerchantWhere(status string, search string, startDate *time.Time, endDate *time.Time) (string, []interface{}) {
	conditions := make([]string, 0)
	args := make([]interface{}, 0)

	if trimmed := strings.TrimSpace(search); trimmed != "" {
		args = append(args, "%"+trimmed+"%")
		param := len(args)
		conditions = append(conditions, fmt.Sprintf(`(
			m.shop_name ILIKE $%d OR owner.email ILIKE $%d OR owner.name ILIKE $%d
		)`, param, param, param))
	}

	switch status {
	case "active":
		conditions = append(conditions, "m.is_active = TRUE")
	case "inactive":
		conditions = append(conditions, "m.is_active = FALSE")
	case "trial", "suspended", "cancelled", "expired", "pending":
		args = append(args, status)
		conditions = append(conditions, fmt.Sprintf("s.status = $%d", len(args)))
	}

	if startDate != nil {
		args = append(args, *startDate)
		conditions = append(conditions, fmt.Sprintf("m.created_at >= $%d", len(args)))
	}

	if endDate != nil {
		args = append(args, endDate.AddDate(0, 0, 1))
		conditions = append(conditions, fmt.Sprintf("m.created_at < $%d", len(args)))
	}

	if len(conditions) == 0 {
		return "", args
	}

	return "WHERE " + strings.Join(conditions, " AND "), args
}

// CreateMerchant inserts a new merchant into the database
func (r *merchantRepository) CreateMerchant(merchant *models.MerchantProfile) error {
	query := `
		INSERT INTO merchants (owner_id, shop_name, address, contact_email, contact_phone, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(query,
		merchant.OwnerID,
		merchant.ShopName,
		merchant.Address,
		merchant.ContactEmail,
		merchant.ContactPhone,
		merchant.IsActive,
	).Scan(&merchant.ID, &merchant.CreatedAt, &merchant.UpdatedAt)

	if err != nil {
		return err
	}

	return nil
}

// FindByID retrieves a merchant by ID
func (r *merchantRepository) FindByID(id uuid.UUID) (*models.MerchantProfile, error) {
	query := `
		SELECT id, owner_id, shop_name, address, contact_email, contact_phone,
		       logo_url, is_active, created_at, updated_at
		FROM merchants
		WHERE id = $1
	`

	var merchant models.MerchantProfile
	err := r.db.QueryRow(query, id).Scan(
		&merchant.ID,
		&merchant.OwnerID,
		&merchant.ShopName,
		&merchant.Address,
		&merchant.ContactEmail,
		&merchant.ContactPhone,
		&merchant.LogoURL,
		&merchant.IsActive,
		&merchant.CreatedAt,
		&merchant.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("merchant not found")
		}
		return nil, err
	}

	// Load additional settings
	merchant.BusinessHours = r.getBusinessHours(id)
	merchant.StrictMode = true // Default to strict mode (no duplicates allowed)

	return &merchant, nil
}

// FindByOwnerID retrieves a merchant by owner user ID
func (r *merchantRepository) FindByOwnerID(ownerID uuid.UUID) (*models.MerchantProfile, error) {
	query := `
		SELECT id, owner_id, shop_name, address, contact_email, contact_phone,
		       logo_url, is_active, created_at, updated_at
		FROM merchants
		WHERE owner_id = $1
	`

	var merchant models.MerchantProfile
	err := r.db.QueryRow(query, ownerID).Scan(
		&merchant.ID,
		&merchant.OwnerID,
		&merchant.ShopName,
		&merchant.Address,
		&merchant.ContactEmail,
		&merchant.ContactPhone,
		&merchant.LogoURL,
		&merchant.IsActive,
		&merchant.CreatedAt,
		&merchant.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("merchant not found")
		}
		return nil, err
	}

	// Load additional settings
	merchant.BusinessHours = r.getBusinessHours(merchant.ID)
	merchant.StrictMode = true // Default to strict mode (no duplicates allowed)

	return &merchant, nil
}

// UpdateMerchant updates merchant information
func (r *merchantRepository) UpdateMerchant(merchant *models.MerchantProfile) error {
	query := `
		UPDATE merchants
		SET shop_name = $2, address = $3, contact_email = $4, contact_phone = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	result, err := r.db.Exec(query,
		merchant.ID,
		merchant.ShopName,
		merchant.Address,
		merchant.ContactEmail,
		merchant.ContactPhone,
	)

	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("merchant not found")
	}

	// Update business hours
	if merchant.BusinessHours != nil {
		r.updateBusinessHours(merchant.ID, merchant.BusinessHours)
	}

	return nil
}

// UpdateLogo updates merchant logo URL
func (r *merchantRepository) UpdateLogo(merchantID uuid.UUID, logoURL string) error {
	query := `
		UPDATE merchants
		SET logo_url = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	result, err := r.db.Exec(query, merchantID, logoURL)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("merchant not found")
	}

	return nil
}

// HasUsedFreePlan returns true once the merchant has consumed the one-time free plan.
func (r *merchantRepository) HasUsedFreePlan(merchantID uuid.UUID) (bool, error) {
	query := `
		SELECT
			COALESCE(m.free_plan_used, false)
			OR EXISTS (
				SELECT 1
				FROM subscriptions s
				WHERE s.merchant_id = m.id AND s.plan_id = 'plan-free'
			)
		FROM merchants m
		WHERE m.id = $1
	`

	var used bool
	if err := r.db.QueryRow(query, merchantID).Scan(&used); err != nil {
		return false, err
	}

	return used, nil
}

// MarkFreePlanUsed permanently records that the merchant has consumed the free plan.
func (r *merchantRepository) MarkFreePlanUsed(merchantID uuid.UUID) error {
	query := `
		UPDATE merchants
		SET free_plan_used = true, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	result, err := r.db.Exec(query, merchantID)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("merchant not found")
	}

	return nil
}

// CreateSubscription creates a new subscription
func (r *merchantRepository) CreateSubscription(subscription *models.Subscription) error {
	query := `
		INSERT INTO subscriptions (merchant_id, plan_id, status, billing_cycle, stripe_subscription_id, stripe_customer_id, started_at, expires_at, auto_renew)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (merchant_id)
		DO UPDATE SET
			plan_id = EXCLUDED.plan_id,
			status = EXCLUDED.status,
			billing_cycle = EXCLUDED.billing_cycle,
			stripe_subscription_id = EXCLUDED.stripe_subscription_id,
			stripe_customer_id = EXCLUDED.stripe_customer_id,
			started_at = EXCLUDED.started_at,
			expires_at = EXCLUDED.expires_at,
			auto_renew = EXCLUDED.auto_renew,
			cancelled_at = NULL,
			updated_at = CURRENT_TIMESTAMP
		RETURNING id, created_at, updated_at
	`

	err := r.db.QueryRow(query,
		subscription.MerchantID,
		subscription.PlanID,
		subscription.Status,
		subscription.BillingCycle,
		subscription.StripeSubscriptionID,
		subscription.StripeCustomerID,
		subscription.StartedAt,
		subscription.ExpiresAt,
		subscription.AutoRenew,
	).Scan(&subscription.ID, &subscription.CreatedAt, &subscription.UpdatedAt)

	if err != nil {
		return err
	}

	return nil
}

// CreatePaymentLog records a Stripe payment once per Checkout Session.
func (r *merchantRepository) CreatePaymentLog(payment *models.PaymentLog) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Stripe may deliver payment_intent.succeeded and checkout.session.completed
	// concurrently. Serialize writes for the same Checkout Session reference.
	lockKey := payment.Gateway + ":" + payment.GatewayReferenceID
	if _, err := tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey); err != nil {
		return err
	}

	query := `
		INSERT INTO payment_logs (
			merchant_id, subscription_id, amount, currency, gateway,
			gateway_reference_id, status, paid_at
		)
		SELECT $1::uuid, $2::uuid, $3::numeric, $4::varchar,
		       $5::payment_gateway, $6::varchar, $7::payment_status, $8::timestamptz
		WHERE NOT EXISTS (
			SELECT 1 FROM payment_logs
			WHERE gateway = $5::payment_gateway
			  AND gateway_reference_id = $6::varchar
		)
		RETURNING id, created_at
	`

	err = tx.QueryRow(
		query,
		payment.MerchantID,
		payment.SubscriptionID,
		payment.Amount,
		payment.Currency,
		payment.Gateway,
		payment.GatewayReferenceID,
		payment.Status,
		payment.PaidAt,
	).Scan(&payment.ID, &payment.CreatedAt)
	if err == sql.ErrNoRows {
		return tx.Commit()
	}
	if err != nil {
		return err
	}
	return tx.Commit()
}

// ListPaymentLogs retrieves paginated payment history for admins.
func (r *merchantRepository) ListPaymentLogs(status string, startDate *time.Time, endDate *time.Time, limit, offset int) ([]models.PaymentLog, int, error) {
	conditions := []string{}
	args := []interface{}{}
	if status != "" {
		args = append(args, status)
		conditions = append(conditions, fmt.Sprintf("p.status = $%d", len(args)))
	}
	if startDate != nil {
		args = append(args, *startDate)
		conditions = append(conditions, fmt.Sprintf("p.created_at >= $%d", len(args)))
	}
	if endDate != nil {
		args = append(args, endDate.AddDate(0, 0, 1))
		conditions = append(conditions, fmt.Sprintf("p.created_at < $%d", len(args)))
	}
	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := "SELECT COUNT(*) FROM payment_logs p " + where
	var total int
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limitPosition := len(args) + 1
	offsetPosition := len(args) + 2
	query := fmt.Sprintf(`
		SELECT p.id, p.merchant_id, m.shop_name, p.subscription_id,
		       p.amount, p.currency, p.gateway::text, p.gateway_reference_id,
		       p.status::text, p.paid_at, p.created_at
		FROM payment_logs p
		JOIN merchants m ON m.id = p.merchant_id
		%s
		ORDER BY p.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, limitPosition, offsetPosition)
	args = append(args, limit, offset)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	payments := make([]models.PaymentLog, 0)
	for rows.Next() {
		var payment models.PaymentLog
		if err := rows.Scan(
			&payment.ID,
			&payment.MerchantID,
			&payment.MerchantName,
			&payment.SubscriptionID,
			&payment.Amount,
			&payment.Currency,
			&payment.Gateway,
			&payment.GatewayReferenceID,
			&payment.Status,
			&payment.PaidAt,
			&payment.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		payments = append(payments, payment)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return payments, total, nil
}

// ListPaymentLogsByMerchant retrieves recent payment history for one merchant.
func (r *merchantRepository) ListPaymentLogsByMerchant(merchantID uuid.UUID, limit int) ([]models.PaymentLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 10
	}

	query := `
		SELECT p.id, p.merchant_id, COALESCE(m.shop_name, '') AS merchant_name,
		       p.subscription_id, p.amount, p.currency, p.gateway,
		       p.gateway_reference_id, p.status, p.paid_at, p.created_at
		FROM payment_logs p
		LEFT JOIN merchants m ON m.id = p.merchant_id
		WHERE p.merchant_id = $1
		ORDER BY p.created_at DESC
		LIMIT $2
	`

	rows, err := r.db.Query(query, merchantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	payments := make([]models.PaymentLog, 0)
	for rows.Next() {
		var payment models.PaymentLog
		if err := rows.Scan(
			&payment.ID,
			&payment.MerchantID,
			&payment.MerchantName,
			&payment.SubscriptionID,
			&payment.Amount,
			&payment.Currency,
			&payment.Gateway,
			&payment.GatewayReferenceID,
			&payment.Status,
			&payment.PaidAt,
			&payment.CreatedAt,
		); err != nil {
			return nil, err
		}
		payments = append(payments, payment)
	}

	return payments, rows.Err()
}

// GetAdminMerchantUsage summarizes lifetime and current-period merchant usage.
func (r *merchantRepository) GetAdminMerchantUsage(merchantID uuid.UUID, periodStart time.Time, quota int, remaining int, resetDate time.Time) (models.AdminMerchantUsage, error) {
	query := `
		SELECT
			COALESCE((SELECT SUM(scan_count)::int FROM usage_counters WHERE merchant_id = $1), 0) AS lifetime_usage,
			COALESCE((SELECT COUNT(*)::int FROM slips WHERE merchant_id = $1), 0) AS total_slips,
			COALESCE((SELECT COUNT(*)::int FROM slips WHERE merchant_id = $1 AND status = 'verified'), 0) AS verified_slips,
			COALESCE((SELECT COUNT(*)::int FROM slips WHERE merchant_id = $1 AND status = 'failed'), 0) AS failed_slips,
			COALESCE((SELECT COUNT(*)::int FROM slips WHERE merchant_id = $1 AND fail_reason = 'DUPLICATE_SLIP'), 0) AS duplicate_slips,
			COALESCE((SELECT COUNT(*)::int FROM transactions WHERE merchant_id = $1), 0) AS total_transactions,
			COALESCE((SELECT SUM(amount)::float8 FROM transactions WHERE merchant_id = $1 AND status = 'success'), 0) AS total_amount
	`

	var usage models.AdminMerchantUsage
	if err := r.db.QueryRow(query, merchantID).Scan(
		&usage.Lifetime,
		&usage.TotalSlips,
		&usage.VerifiedSlips,
		&usage.FailedSlips,
		&usage.DuplicateSlips,
		&usage.TotalTransactions,
		&usage.TotalAmount,
	); err != nil {
		return usage, err
	}

	usage.ThisMonth = r.getUsageForPeriod(merchantID, periodStart)
	usage.Quota = quota
	usage.Remaining = remaining
	usage.CurrentPeriodStart = periodStart.Format("2006-01-02")
	usage.NextReset = resetDate.Format("2006-01-02")

	return usage, nil
}

// GetAdminMerchantBillingSummary summarizes plan activations and revenue for one merchant.
func (r *merchantRepository) GetAdminMerchantBillingSummary(merchantID uuid.UUID) (models.AdminMerchantBillingSummary, error) {
	summary := models.AdminMerchantBillingSummary{
		RevenueByPlan: make([]models.AdminMerchantPlanRevenue, 0),
	}

	query := `
		SELECT
			COALESCE((
				SELECT COUNT(*)::int
				FROM payment_logs
				WHERE merchant_id = $1 AND status = 'success'
			), 0) AS successful_payments,
			COALESCE((
				SELECT COUNT(*)::int
				FROM payment_logs
				WHERE merchant_id = $1 AND status = 'failed'
			), 0) AS failed_payments,
			COALESCE((
				SELECT SUM(amount)::float8
				FROM payment_logs
				WHERE merchant_id = $1 AND status = 'success'
			), 0) AS total_revenue,
			COALESCE((
				SELECT free_plan_used
				FROM merchants
				WHERE id = $1
			), false) AS free_plan_used,
			(
				SELECT MAX(paid_at)
				FROM payment_logs
				WHERE merchant_id = $1 AND status = 'success'
			) AS last_paid_at
	`

	var lastPaidAt sql.NullTime
	if err := r.db.QueryRow(query, merchantID).Scan(
		&summary.SuccessfulPayments,
		&summary.FailedPayments,
		&summary.TotalRevenue,
		&summary.FreePlanUsed,
		&lastPaidAt,
	); err != nil {
		return summary, err
	}
	if lastPaidAt.Valid {
		summary.LastPaidAt = &lastPaidAt.Time
	}
	summary.PaidActivations = summary.SuccessfulPayments
	summary.PlanActivations = summary.PaidActivations
	if summary.FreePlanUsed {
		summary.PlanActivations++
	}

	planQuery := `
		SELECT
			COALESCE(sp.id, 'unknown') AS plan_id,
			COALESCE(sp.name, 'Unknown') AS plan,
			COUNT(pl.id)::int AS activations,
			COALESCE(SUM(pl.amount)::float8, 0) AS revenue
		FROM payment_logs pl
		LEFT JOIN subscriptions s ON s.id = pl.subscription_id
		LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
		WHERE pl.merchant_id = $1 AND pl.status = 'success'
		GROUP BY sp.id, sp.name
		ORDER BY revenue DESC, plan ASC
	`

	rows, err := r.db.Query(planQuery, merchantID)
	if err != nil {
		return summary, err
	}
	defer rows.Close()

	for rows.Next() {
		var item models.AdminMerchantPlanRevenue
		if err := rows.Scan(&item.PlanID, &item.Plan, &item.Activations, &item.Revenue); err != nil {
			return summary, err
		}
		summary.RevenueByPlan = append(summary.RevenueByPlan, item)
	}
	if err := rows.Err(); err != nil {
		return summary, err
	}

	if summary.FreePlanUsed {
		summary.RevenueByPlan = append([]models.AdminMerchantPlanRevenue{{
			PlanID:      "plan-free",
			Plan:        "Free",
			Activations: 1,
			Revenue:     0,
		}}, summary.RevenueByPlan...)
	}

	return summary, nil
}

// GetAdminAnalyticsDashboard returns platform-level KPI data for backoffice.
func (r *merchantRepository) GetAdminAnalyticsDashboard() (models.AdminAnalyticsDashboard, error) {
	query := `
		SELECT
			COALESCE((SELECT COUNT(*)::int FROM transactions), 0) AS total_transactions,
			COALESCE((SELECT COUNT(*)::int FROM transactions WHERE status = 'success'), 0) AS successful_transactions,
			COALESCE((SELECT COUNT(*)::int FROM transactions WHERE status = 'failed'), 0) AS failed_transactions,
			COALESCE((SELECT COUNT(*)::int FROM merchants WHERE is_active = TRUE), 0) AS active_merchants,
			COALESCE((SELECT COUNT(*)::int FROM merchants), 0) AS total_merchants,
			COALESCE((SELECT COUNT(*)::int FROM users), 0) AS total_users,
			COALESCE((SELECT COUNT(*)::int FROM line_webhook_configs), 0) AS connected_bots,
			COALESCE((SELECT SUM(scan_count)::int FROM usage_counters), 0) AS total_scans,
			COALESCE((SELECT SUM(amount)::float8 FROM payment_logs WHERE status = 'success'), 0) AS total_revenue,
			COALESCE((SELECT COUNT(*)::int FROM transactions WHERE created_at::date = CURRENT_DATE), 0) AS today_transactions,
			COALESCE((SELECT SUM(amount)::float8 FROM payment_logs WHERE status = 'success' AND paid_at::date = CURRENT_DATE), 0) AS today_revenue,
			COALESCE((
				SELECT (COUNT(*) FILTER (WHERE status = 'failed')::float8 / NULLIF(COUNT(*) FILTER (WHERE status IN ('verified', 'failed')), 0)::float8) * 100
				FROM slips
			), 0) AS system_error_rate
	`

	var dashboard models.AdminAnalyticsDashboard
	if err := r.db.QueryRow(query).Scan(
		&dashboard.TotalTransactions,
		&dashboard.SuccessfulTransactions,
		&dashboard.FailedTransactions,
		&dashboard.ActiveMerchants,
		&dashboard.TotalMerchants,
		&dashboard.TotalUsers,
		&dashboard.ConnectedBots,
		&dashboard.TotalScans,
		&dashboard.TotalRevenue,
		&dashboard.TodayTransactions,
		&dashboard.TodayRevenue,
		&dashboard.SystemErrorRate,
	); err != nil {
		return dashboard, err
	}

	return dashboard, nil
}

// GetAdminRevenueAnalytics returns revenue analytics grouped by plan.
func (r *merchantRepository) GetAdminRevenueAnalytics(period string) (models.AdminRevenueAnalytics, error) {
	analytics := models.AdminRevenueAnalytics{
		RevenueByPlan: make([]models.AdminRevenueByPlan, 0),
	}

	revenueByPlanQuery := `
		SELECT COALESCE(sp.name, 'Unknown') AS plan, COALESCE(SUM(pl.amount)::float8, 0) AS revenue
		FROM payment_logs pl
		LEFT JOIN subscriptions s ON s.id = pl.subscription_id
		LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
		WHERE pl.status = 'success'
		GROUP BY sp.name
		ORDER BY revenue DESC
	`
	rows, err := r.db.Query(revenueByPlanQuery)
	if err != nil {
		return analytics, err
	}
	defer rows.Close()

	for rows.Next() {
		var item models.AdminRevenueByPlan
		if err := rows.Scan(&item.Plan, &item.Revenue); err != nil {
			return analytics, err
		}
		analytics.RevenueByPlan = append(analytics.RevenueByPlan, item)
	}
	if err := rows.Err(); err != nil {
		return analytics, err
	}

	query := `
		SELECT
			COALESCE((
				SELECT SUM(
					CASE
						WHEN s.billing_cycle = 'yearly' THEN sp.price_yearly / 12
						ELSE sp.price_monthly
					END
				)::float8
				FROM subscriptions s
				JOIN subscription_plans sp ON sp.id = s.plan_id
				WHERE s.status = 'active'
			), 0) AS mrr,
			COALESCE((
				SELECT SUM(amount)::float8 FROM payment_logs
				WHERE status = 'success'
					AND created_at >= date_trunc('month', CURRENT_DATE)
			), 0) AS current_month_revenue,
			COALESCE((
				SELECT SUM(amount)::float8 FROM payment_logs
				WHERE status = 'success'
					AND created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
					AND created_at < date_trunc('month', CURRENT_DATE)
			), 0) AS previous_month_revenue,
			COALESCE((
				SELECT (COUNT(*) FILTER (WHERE status IN ('cancelled', 'expired'))::float8 / NULLIF(COUNT(*), 0)::float8) * 100
				FROM subscriptions
			), 0) AS churn_rate
	`

	var currentMonthRevenue float64
	var previousMonthRevenue float64
	if err := r.db.QueryRow(query).Scan(
		&analytics.MRR,
		&currentMonthRevenue,
		&previousMonthRevenue,
		&analytics.ChurnRate,
	); err != nil {
		return analytics, err
	}

	if previousMonthRevenue > 0 {
		analytics.GrowthPercent = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
	} else if currentMonthRevenue > 0 {
		analytics.GrowthPercent = 100
	}
	analytics.RenewalRate = 100 - analytics.ChurnRate

	return analytics, nil
}

// GetAdminMerchantPerformance returns platform merchant usage breakdown.
func (r *merchantRepository) GetAdminMerchantPerformance() (models.AdminMerchantPerformanceAnalytics, error) {
	analytics := models.AdminMerchantPerformanceAnalytics{
		UsagePerMerchant: make([]models.AdminMerchantPerformanceItem, 0),
		TopActive:        make([]models.AdminMerchantPerformanceItem, 0),
		LowUsage:         make([]models.AdminMerchantPerformanceItem, 0),
	}

	query := `
		SELECT
			m.id,
			m.shop_name,
			COALESCE((SELECT SUM(scan_count)::int FROM usage_counters uc WHERE uc.merchant_id = m.id), 0) AS scans,
			COALESCE(sp.quota_per_month, 0) AS quota,
			COALESCE((SELECT MAX(created_at) FROM slips sl WHERE sl.merchant_id = m.id), NULL) AS last_scan
		FROM merchants m
		LEFT JOIN subscriptions s ON s.merchant_id = m.id
		LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
		ORDER BY scans DESC, m.created_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return analytics, err
	}
	defer rows.Close()

	for rows.Next() {
		var item models.AdminMerchantPerformanceItem
		var lastScan sql.NullTime
		if err := rows.Scan(&item.MerchantID, &item.ShopName, &item.Scans, &item.Quota, &lastScan); err != nil {
			return analytics, err
		}
		if lastScan.Valid {
			item.LastScan = &lastScan.Time
		}
		if item.Quota > 0 {
			item.QuotaPercent = float64(item.Scans) / float64(item.Quota) * 100
		}
		analytics.UsagePerMerchant = append(analytics.UsagePerMerchant, item)
	}
	if err := rows.Err(); err != nil {
		return analytics, err
	}

	for index, item := range analytics.UsagePerMerchant {
		if index < 5 {
			analytics.TopActive = append(analytics.TopActive, item)
		}
		if item.Scans <= 5 {
			analytics.LowUsage = append(analytics.LowUsage, item)
		}
	}
	if len(analytics.LowUsage) > 5 {
		analytics.LowUsage = analytics.LowUsage[:5]
	}

	return analytics, nil
}

// GetMerchantAnalyticsDashboard returns KPI data for the merchant dashboard.
func (r *merchantRepository) GetMerchantAnalyticsDashboard(merchantID uuid.UUID) (models.MerchantAnalyticsDashboard, error) {
	query := `
		SELECT
			COALESCE((SELECT SUM(scan_count)::int FROM usage_counters WHERE merchant_id = $1), 0) AS total_scans,
			COUNT(s.id) FILTER (WHERE s.created_at::date = CURRENT_DATE)::int AS today_scans,
			COUNT(s.id) FILTER (WHERE s.status = 'verified')::int AS verified_scans,
			COUNT(s.id) FILTER (WHERE s.status = 'failed')::int AS failed_scans,
			COUNT(s.id) FILTER (WHERE s.status IN ('pending', 'processing'))::int AS pending_confirmations,
			COUNT(s.id) FILTER (
				WHERE s.status IN ('verified', 'failed') AND s.created_at::date = CURRENT_DATE
			)::int AS completed_today,
			COALESCE((
				SELECT SUM(amount)::float8
				FROM transactions
				WHERE merchant_id = $1 AND status = 'success' AND created_at::date = CURRENT_DATE
			), 0) AS daily_revenue,
			COALESCE((
				SELECT SUM(amount)::float8
				FROM transactions
				WHERE merchant_id = $1 AND status = 'success'
			), 0) AS lifetime_revenue,
			COALESCE((
				SELECT COUNT(*)::int
				FROM transactions
				WHERE merchant_id = $1 AND status = 'success'
			), 0) AS lifetime_transactions
		FROM slips s
		WHERE s.merchant_id = $1
	`

	var dashboard models.MerchantAnalyticsDashboard
	if err := r.db.QueryRow(query, merchantID).Scan(
		&dashboard.TotalScans,
		&dashboard.TodayScans,
		&dashboard.VerifiedScans,
		&dashboard.FailedScans,
		&dashboard.PendingConfirmations,
		&dashboard.CompletedToday,
		&dashboard.DailyRevenue,
		&dashboard.LifetimeRevenue,
		&dashboard.LifetimeTransactions,
	); err != nil {
		return dashboard, fmt.Errorf("failed to get merchant analytics dashboard: %w", err)
	}

	completed := dashboard.VerifiedScans + dashboard.FailedScans
	if completed > 0 {
		dashboard.SuccessRate = float64(dashboard.VerifiedScans) / float64(completed) * 100
	}

	if total, newClients, previousClients, err := r.GetLineBotClientStats(merchantID); err == nil {
		dashboard.BotClients = total
		dashboard.NewBotClients = newClients
		dashboard.PreviousBotClients = previousClients
	}

	return dashboard, nil
}

// RecordLineBotClient upserts a LINE user who interacted with a merchant bot.
func (r *merchantRepository) RecordLineBotClient(merchantID uuid.UUID, lineUserID string, active bool) error {
	lineUserID = strings.TrimSpace(lineUserID)
	if lineUserID == "" {
		return nil
	}

	query := `
		INSERT INTO line_bot_clients (
			merchant_id, line_user_id, is_active, first_seen_at, last_seen_at, unfollowed_at, updated_at
		)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CASE WHEN $3 THEN NULL ELSE CURRENT_TIMESTAMP END, CURRENT_TIMESTAMP)
		ON CONFLICT (merchant_id, line_user_id)
		DO UPDATE SET
			is_active = EXCLUDED.is_active,
			last_seen_at = CASE WHEN EXCLUDED.is_active THEN CURRENT_TIMESTAMP ELSE line_bot_clients.last_seen_at END,
			unfollowed_at = CASE WHEN EXCLUDED.is_active THEN NULL ELSE CURRENT_TIMESTAMP END,
			updated_at = CURRENT_TIMESTAMP
	`

	if _, err := r.db.Exec(query, merchantID, lineUserID, active); err != nil {
		return fmt.Errorf("failed to record LINE bot client: %w", err)
	}

	return nil
}

// GetLineBotClientStats returns active LINE client counts for a merchant bot.
func (r *merchantRepository) GetLineBotClientStats(merchantID uuid.UUID) (int, int, int, error) {
	var total, newClients, previousClients int
	err := r.db.QueryRow(`
		SELECT
			COUNT(*) FILTER (WHERE is_active = TRUE)::int AS total,
			COUNT(*) FILTER (
				WHERE is_active = TRUE
				  AND first_seen_at >= date_trunc('month', CURRENT_DATE)
			)::int AS new_clients,
			COUNT(*) FILTER (
				WHERE is_active = TRUE
				  AND first_seen_at < date_trunc('month', CURRENT_DATE)
			)::int AS previous_clients
		FROM line_bot_clients
		WHERE merchant_id = $1
	`, merchantID).Scan(&total, &newClients, &previousClients)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to count LINE bot clients: %w", err)
	}

	return total, newClients, previousClients, nil
}

// GetMerchantAnalyticsUsage returns daily usage, peak time, and failure reason breakdowns.
func (r *merchantRepository) GetMerchantAnalyticsUsage(merchantID uuid.UUID, days int) (models.MerchantAnalyticsUsage, error) {
	if days != 30 && days != 90 {
		days = 7
	}

	usage := models.MerchantAnalyticsUsage{
		UsagePerDay:       make([]models.MerchantUsagePoint, 0, days),
		FailedScanReasons: make([]models.MerchantFailedScanReason, 0),
	}

	dailyQuery := `
		WITH dates AS (
			SELECT generate_series(
				CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day'),
				CURRENT_DATE,
				INTERVAL '1 day'
			)::date AS day
		)
		SELECT
			TO_CHAR(dates.day, 'YYYY-MM-DD') AS date,
			COUNT(s.id)::int AS count,
			COUNT(s.id) FILTER (WHERE s.status = 'verified')::int AS verified,
			COUNT(s.id) FILTER (WHERE s.status = 'failed')::int AS failed
		FROM dates
		LEFT JOIN slips s
			ON s.merchant_id = $1
			AND s.created_at::date = dates.day
		GROUP BY dates.day
		ORDER BY dates.day ASC
	`

	rows, err := r.db.Query(dailyQuery, merchantID, days)
	if err != nil {
		return usage, fmt.Errorf("failed to get merchant daily usage: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var point models.MerchantUsagePoint
		if err := rows.Scan(&point.Date, &point.Count, &point.Verified, &point.Failed); err != nil {
			return usage, err
		}
		usage.UsagePerDay = append(usage.UsagePerDay, point)
	}
	if err := rows.Err(); err != nil {
		return usage, err
	}

	peakQuery := `
		SELECT
			(FLOOR(EXTRACT(HOUR FROM created_at) / 2) * 2)::int AS start_hour,
			COUNT(*)::int AS scan_count
		FROM slips
		WHERE merchant_id = $1
			AND created_at >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
		GROUP BY start_hour
		ORDER BY scan_count DESC, start_hour ASC
		LIMIT 1
	`

	var startHour int
	var peakCount int
	if err := r.db.QueryRow(peakQuery, merchantID, days).Scan(&startHour, &peakCount); err == nil && peakCount > 0 {
		usage.PeakTime = fmt.Sprintf("%02d:00-%02d:00", startHour, (startHour+2)%24)
	} else {
		usage.PeakTime = "N/A"
	}

	reasonQuery := `
		SELECT COALESCE(fail_reason::text, 'UNKNOWN') AS reason, COUNT(*)::int AS count
		FROM slips
		WHERE merchant_id = $1
			AND status = 'failed'
			AND created_at >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
		GROUP BY reason
		ORDER BY count DESC, reason ASC
	`

	reasonRows, err := r.db.Query(reasonQuery, merchantID, days)
	if err != nil {
		return usage, fmt.Errorf("failed to get merchant failed scan reasons: %w", err)
	}
	defer reasonRows.Close()

	for reasonRows.Next() {
		var reason models.MerchantFailedScanReason
		if err := reasonRows.Scan(&reason.Reason, &reason.Count); err != nil {
			return usage, err
		}
		usage.FailedScanReasons = append(usage.FailedScanReasons, reason)
	}
	if err := reasonRows.Err(); err != nil {
		return usage, err
	}

	return usage, nil
}

// ListMerchantAnalyticsExport returns daily analytics rows for CSV export.
func (r *merchantRepository) ListMerchantAnalyticsExport(merchantID uuid.UUID, startDate, endDate time.Time) ([]models.MerchantAnalyticsExportRow, error) {
	query := `
		WITH dates AS (
			SELECT generate_series($2::date, $3::date, INTERVAL '1 day')::date AS day
		),
		slip_daily AS (
			SELECT
				created_at::date AS day,
				COUNT(*)::int AS scans,
				COUNT(*) FILTER (WHERE status = 'verified')::int AS verified,
				COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
			FROM slips
			WHERE merchant_id = $1
				AND created_at::date BETWEEN $2::date AND $3::date
			GROUP BY created_at::date
		),
		transaction_daily AS (
			SELECT
				created_at::date AS day,
				COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0)::float8 AS revenue
			FROM transactions
			WHERE merchant_id = $1
				AND created_at::date BETWEEN $2::date AND $3::date
			GROUP BY created_at::date
		)
		SELECT
			TO_CHAR(dates.day, 'YYYY-MM-DD') AS date,
			COALESCE(slip_daily.scans, 0) AS scans,
			COALESCE(slip_daily.verified, 0) AS verified,
			COALESCE(slip_daily.failed, 0) AS failed,
			COALESCE(transaction_daily.revenue, 0) AS revenue
		FROM dates
		LEFT JOIN slip_daily ON slip_daily.day = dates.day
		LEFT JOIN transaction_daily ON transaction_daily.day = dates.day
		ORDER BY dates.day ASC
	`

	rows, err := r.db.Query(query, merchantID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to export merchant analytics: %w", err)
	}
	defer rows.Close()

	exportRows := make([]models.MerchantAnalyticsExportRow, 0)
	for rows.Next() {
		var row models.MerchantAnalyticsExportRow
		if err := rows.Scan(&row.Date, &row.Scans, &row.Verified, &row.Failed, &row.Revenue); err != nil {
			return nil, err
		}
		exportRows = append(exportRows, row)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return exportRows, nil
}

// FindByMerchantID retrieves subscription by merchant ID
func (r *merchantRepository) FindByMerchantID(merchantID uuid.UUID) (*models.Subscription, error) {
	query := `
		SELECT s.id, s.merchant_id, s.plan_id, s.status, s.billing_cycle,
		       s.stripe_subscription_id, s.stripe_customer_id, s.started_at, s.expires_at,
		       s.auto_renew, s.cancelled_at, s.created_at, s.updated_at,
		       p.name as plan_name, p.price_monthly, p.price_yearly, p.quota_per_month,
		       p.features, p.is_popular
		FROM subscriptions s
		LEFT JOIN subscription_plans p ON s.plan_id = p.id
		WHERE s.merchant_id = $1
		ORDER BY s.created_at DESC
		LIMIT 1
	`

	var subscription models.Subscription
	var plan models.SubscriptionPlan
	var featuresJSON string

	err := r.db.QueryRow(query, merchantID).Scan(
		&subscription.ID,
		&subscription.MerchantID,
		&subscription.PlanID,
		&subscription.Status,
		&subscription.BillingCycle,
		&subscription.StripeSubscriptionID,
		&subscription.StripeCustomerID,
		&subscription.StartedAt,
		&subscription.ExpiresAt,
		&subscription.AutoRenew,
		&subscription.CancelledAt,
		&subscription.CreatedAt,
		&subscription.UpdatedAt,
		&plan.Name,
		&plan.PriceMonthly,
		&plan.PriceYearly,
		&plan.QuotaPerMonth,
		&featuresJSON,
		&plan.IsPopular,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("subscription not found")
		}
		return nil, err
	}

	// Parse features JSON
	if featuresJSON != "" {
		json.Unmarshal([]byte(featuresJSON), &plan.Features)
	}

	subscription.Plan = &plan

	// Load usage statistics
	periodStart, _ := models.QuotaPeriodFor(subscription.StartedAt, time.Now())
	subscription.UsageThisMonth = r.getUsageForPeriod(merchantID, periodStart)
	subscription.RemainingQuota = plan.QuotaPerMonth - subscription.UsageThisMonth

	return &subscription, nil
}

// UpdateSubscription updates subscription information
func (r *merchantRepository) UpdateSubscription(subscription *models.Subscription) error {
	query := `
		UPDATE subscriptions
		SET status = $2, expires_at = $3, auto_renew = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	result, err := r.db.Exec(query,
		subscription.ID,
		subscription.Status,
		subscription.ExpiresAt,
		subscription.AutoRenew,
	)

	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("subscription not found")
	}

	return nil
}

// CancelSubscription cancels a subscription
func (r *merchantRepository) CancelSubscription(merchantID uuid.UUID, reason string) error {
	query := `
		UPDATE subscriptions
		SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, auto_renew = false, updated_at = CURRENT_TIMESTAMP
		WHERE merchant_id = $1
	`

	result, err := r.db.Exec(query, merchantID)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("subscription not found")
	}

	return nil
}

// GetAllPlans retrieves all active subscription plans
func (r *merchantRepository) GetAllPlans() ([]models.SubscriptionPlan, error) {
	query := `
		SELECT id, name, description, price_monthly, price_yearly, quota_per_month, features, is_popular, is_active, created_at, updated_at
		FROM subscription_plans
		WHERE is_active = true
		ORDER BY price_monthly ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []models.SubscriptionPlan

	for rows.Next() {
		var plan models.SubscriptionPlan
		var featuresJSON string

		err := rows.Scan(
			&plan.ID,
			&plan.Name,
			&plan.Description,
			&plan.PriceMonthly,
			&plan.PriceYearly,
			&plan.QuotaPerMonth,
			&featuresJSON,
			&plan.IsPopular,
			&plan.IsActive,
			&plan.CreatedAt,
			&plan.UpdatedAt,
		)

		if err != nil {
			return nil, err
		}

		// Parse features JSON
		if featuresJSON != "" {
			json.Unmarshal([]byte(featuresJSON), &plan.Features)
		}

		plans = append(plans, plan)
	}

	return plans, nil
}

// GetPlanByID retrieves a plan by ID
func (r *merchantRepository) GetPlanByID(planID string) (*models.SubscriptionPlan, error) {
	query := `
		SELECT id, name, description, price_monthly, price_yearly, quota_per_month, features, is_popular, is_active, created_at, updated_at
		FROM subscription_plans
		WHERE id = $1
	`

	var plan models.SubscriptionPlan
	var featuresJSON string

	err := r.db.QueryRow(query, planID).Scan(
		&plan.ID,
		&plan.Name,
		&plan.Description,
		&plan.PriceMonthly,
		&plan.PriceYearly,
		&plan.QuotaPerMonth,
		&featuresJSON,
		&plan.IsPopular,
		&plan.IsActive,
		&plan.CreatedAt,
		&plan.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("plan not found")
		}
		return nil, err
	}

	// Parse features JSON
	if featuresJSON != "" {
		json.Unmarshal([]byte(featuresJSON), &plan.Features)
	}

	return &plan, nil
}

// GetSettings retrieves merchant settings
func (r *merchantRepository) GetSettings(merchantID uuid.UUID) (*models.MerchantSettings, error) {
	// For now, return default settings
	// In a full implementation, you'd store these in the database
	return &models.MerchantSettings{
		MerchantID: merchantID,
		NotificationPreferences: models.NotificationPreferences{
			SendLineNotifications:      true,
			SendEmailSummary:           true,
			NotifyOnFailedVerification: true,
			DailySummaryTime:           "18:00",
		},
		BusinessPreferences: models.BusinessPreferences{
			Currency: "THB",
			Timezone: "Asia/Bangkok",
			Language: "th",
		},
		UpdatedAt: time.Now(),
	}, nil
}

// UpdateSettings updates merchant settings
func (r *merchantRepository) UpdateSettings(settings *models.MerchantSettings) error {
	// For now, this is a placeholder
	// In a full implementation, you'd store these in the database
	return nil
}

// GetQuotaStatus retrieves quota usage status
func (r *merchantRepository) GetQuotaStatus(merchantID uuid.UUID) (*models.QuotaStatus, error) {
	// Get merchant's subscription to find quota limit
	subscription, err := r.FindByMerchantID(merchantID)
	if err != nil {
		return nil, err
	}

	periodStart, resetDate := models.QuotaPeriodFor(subscription.StartedAt, time.Now())
	used := r.getUsageForPeriod(merchantID, periodStart)

	quotaLimit := subscription.Plan.QuotaPerMonth
	remaining := quotaLimit - used
	isBlocked := used >= quotaLimit

	return &models.QuotaStatus{
		QuotaLimit: quotaLimit,
		Used:       used,
		Remaining:  remaining,
		ResetDate:  resetDate,
		IsBlocked:  isBlocked,
	}, nil
}

// UpdateUsageCounter updates usage counter for a merchant
func (r *merchantRepository) UpdateUsageCounter(merchantID uuid.UUID, year, month int, increment int) error {
	query := `
		INSERT INTO usage_counters (merchant_id, year, month, scan_count)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (merchant_id, year, month)
		DO UPDATE SET
			scan_count = usage_counters.scan_count + $4,
			updated_at = CURRENT_TIMESTAMP
	`

	_, err := r.db.Exec(query, merchantID, year, month, increment)
	return err
}

// ResetUsageCounter starts a fresh quota bucket for a newly activated plan period.
func (r *merchantRepository) ResetUsageCounter(merchantID uuid.UUID, year, month int) error {
	query := `
		INSERT INTO usage_counters (merchant_id, year, month, scan_count, success_count, failed_count)
		VALUES ($1, $2, $3, 0, 0, 0)
		ON CONFLICT (merchant_id, year, month)
		DO UPDATE SET
			scan_count = 0,
			success_count = 0,
			failed_count = 0,
			updated_at = CURRENT_TIMESTAMP
	`

	_, err := r.db.Exec(query, merchantID, year, month)
	return err
}

// Helper functions

func (r *merchantRepository) getBusinessHours(merchantID uuid.UUID) *models.BusinessHours {
	// Placeholder - in full implementation, query from database
	return &models.BusinessHours{
		Open:  "09:00",
		Close: "18:00",
		Days:  []string{"mon", "tue", "wed", "thu", "fri", "sat"},
	}
}

func (r *merchantRepository) updateBusinessHours(merchantID uuid.UUID, hours *models.BusinessHours) error {
	// Placeholder - in full implementation, store in database
	return nil
}

func (r *merchantRepository) getUsageForPeriod(merchantID uuid.UUID, periodStart time.Time) int {
	query := `
		SELECT COALESCE(scan_count, 0)
		FROM usage_counters
		WHERE merchant_id = $1 AND year = $2 AND month = $3
	`

	var count int
	err := r.db.QueryRow(query, merchantID, periodStart.Year(), int(periodStart.Month())).Scan(&count)
	if err != nil {
		return 0
	}

	return count
}

// LINE webhook operations

// GetLINEWebhookConfig retrieves LINE webhook configuration for a merchant
func (r *merchantRepository) GetLINEWebhookConfig(merchantID uuid.UUID) (*models.LINEWebhookConfig, error) {
	query := `
		SELECT merchant_id, line_channel_id, webhook_reference_id, created_at, updated_at
		FROM line_webhook_configs
		WHERE merchant_id = $1
	`

	var config models.LINEWebhookConfig
	var webhookRefID sql.NullString

	err := r.db.QueryRow(query, merchantID).Scan(
		&config.MerchantID,
		&config.LINEChannelID,
		&webhookRefID,
		&config.CreatedAt,
		&config.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return &models.LINEWebhookConfig{
				MerchantID:   merchantID,
				IsConfigured: false,
			}, nil
		}
		return nil, err
	}

	config.IsConfigured = true
	if webhookRefID.Valid {
		config.WebhookReferenceID = &webhookRefID.String
	}

	return &config, nil
}

// UpdateLINEWebhookConfig updates LINE webhook configuration for a merchant
func (r *merchantRepository) UpdateLINEWebhookConfig(merchantID uuid.UUID, lineChannelID, encryptedChannelSecret, encryptedAccessToken, webhookRefID string) error {
	query := `
		INSERT INTO line_webhook_configs (merchant_id, line_channel_id, encrypted_channel_secret, encrypted_access_token, webhook_reference_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (merchant_id)
		DO UPDATE SET
			line_channel_id = $2,
			encrypted_channel_secret = $3,
			encrypted_access_token = $4,
			webhook_reference_id = $5,
			updated_at = CURRENT_TIMESTAMP
	`

	_, err := r.db.Exec(query, merchantID, lineChannelID, encryptedChannelSecret, encryptedAccessToken, webhookRefID)
	return err
}

// DeleteLINEWebhookConfig removes LINE webhook configuration
func (r *merchantRepository) DeleteLINEWebhookConfig(merchantID uuid.UUID) error {
	query := `DELETE FROM line_webhook_configs WHERE merchant_id = $1`
	_, err := r.db.Exec(query, merchantID)
	return err
}

// GetLINECredentials retrieves encrypted LINE credentials for a merchant
func (r *merchantRepository) GetLINECredentials(merchantID uuid.UUID) (channelID, encryptedSecret, encryptedToken, webhookRefID string, err error) {
	query := `
		SELECT line_channel_id, encrypted_channel_secret, encrypted_access_token, webhook_reference_id
		FROM line_webhook_configs
		WHERE merchant_id = $1
	`

	var webhookRefIDNull sql.NullString

	err = r.db.QueryRow(query, merchantID).Scan(
		&channelID,
		&encryptedSecret,
		&encryptedToken,
		&webhookRefIDNull,
	)

	if err != nil {
		return "", "", "", "", err
	}

	if webhookRefIDNull.Valid {
		webhookRefID = webhookRefIDNull.String
	}

	return channelID, encryptedSecret, encryptedToken, webhookRefID, nil
}

// FindByWebhookReferenceID finds a merchant by webhook reference ID
func (r *merchantRepository) FindByWebhookReferenceID(webhookRefID string) (*models.MerchantProfile, error) {
	query := `
		SELECT m.id, m.owner_id, m.shop_name, m.address, m.contact_email, m.contact_phone,
		       m.logo_url, m.is_active, m.created_at, m.updated_at
		FROM merchants m
		INNER JOIN line_webhook_configs lwc ON m.id = lwc.merchant_id
		WHERE lwc.webhook_reference_id = $1
	`

	var merchant models.MerchantProfile
	err := r.db.QueryRow(query, webhookRefID).Scan(
		&merchant.ID,
		&merchant.OwnerID,
		&merchant.ShopName,
		&merchant.Address,
		&merchant.ContactEmail,
		&merchant.ContactPhone,
		&merchant.LogoURL,
		&merchant.IsActive,
		&merchant.CreatedAt,
		&merchant.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("merchant not found with this webhook reference ID")
		}
		return nil, err
	}

	// Load additional settings
	merchant.BusinessHours = r.getBusinessHours(merchant.ID)
	merchant.StrictMode = true

	return &merchant, nil
}
