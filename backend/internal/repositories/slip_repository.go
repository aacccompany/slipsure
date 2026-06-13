package repositories

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
)

// SlipRepository handles slip database operations
type SlipRepository interface {
	Create(slip *models.Slip) error
	FindByID(id uuid.UUID) (*models.Slip, error)
	FindByMerchantID(merchantID uuid.UUID, limit, offset int) ([]*models.Slip, error)
	CountByMerchantID(merchantID uuid.UUID) (int, error)
	GetStatsByMerchantID(merchantID uuid.UUID) (*models.SlipStatsResponse, error)
	GetDailyStatsByMerchantID(merchantID uuid.UUID, days int) ([]models.DailySlipStats, error)
	UpdateStatus(id uuid.UUID, status models.SlipStatus) error
	UpdateWithTransaction(slip *models.Slip, transaction *models.Transaction) error
	CountByMerchantAndDate(merchantID uuid.UUID, date time.Time) (int, error)
	CheckDuplicate(merchantID uuid.UUID, qrData string, withinHours int, excludeID uuid.UUID) (*models.Slip, error)
}

type slipRepository struct {
	db *sql.DB
}

// NewSlipRepository creates a new slip repository
func NewSlipRepository(db *sql.DB) SlipRepository {
	return &slipRepository{db: db}
}

// Create inserts a new slip record
func (r *slipRepository) Create(slip *models.Slip) error {
	query := `
		INSERT INTO slips (id, merchant_id, image_url, qr_raw_data, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, merchant_id, image_url, qr_raw_data, status, fail_reason,
			processing_started_at, processing_completed_at, created_at, updated_at
	`

	err := r.db.QueryRow(
		query,
		slip.ID, slip.MerchantID, slip.ImageURL, slip.QRRawData, slip.Status,
		slip.CreatedAt, slip.UpdatedAt,
	).Scan(
		&slip.ID, &slip.MerchantID, &slip.ImageURL, &slip.QRRawData, &slip.Status,
		&slip.FailReason, &slip.ProcessingStartedAt, &slip.ProcessingCompletedAt,
		&slip.CreatedAt, &slip.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create slip: %w", err)
	}

	return nil
}

// FindByID retrieves a slip by ID
func (r *slipRepository) FindByID(id uuid.UUID) (*models.Slip, error) {
	query := `
		SELECT id, merchant_id, image_url, qr_raw_data, status, fail_reason,
			processing_started_at, processing_completed_at, created_at, updated_at
		FROM slips
		WHERE id = $1
	`

	slip := &models.Slip{}
	err := r.db.QueryRow(query, id).Scan(
		&slip.ID, &slip.MerchantID, &slip.ImageURL, &slip.QRRawData, &slip.Status,
		&slip.FailReason, &slip.ProcessingStartedAt, &slip.ProcessingCompletedAt,
		&slip.CreatedAt, &slip.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return slip, nil
}

// FindByMerchantID retrieves slips for a merchant with pagination
func (r *slipRepository) FindByMerchantID(merchantID uuid.UUID, limit, offset int) ([]*models.Slip, error) {
	query := `
		SELECT id, merchant_id, image_url, qr_raw_data, status, fail_reason,
			processing_started_at, processing_completed_at, created_at, updated_at
		FROM slips
		WHERE merchant_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(query, merchantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var slips []*models.Slip
	for rows.Next() {
		slip := &models.Slip{}
		err := rows.Scan(
			&slip.ID, &slip.MerchantID, &slip.ImageURL, &slip.QRRawData, &slip.Status,
			&slip.FailReason, &slip.ProcessingStartedAt, &slip.ProcessingCompletedAt,
			&slip.CreatedAt, &slip.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		slips = append(slips, slip)
	}

	return slips, nil
}

// CountByMerchantID counts all slips for a merchant.
func (r *slipRepository) CountByMerchantID(merchantID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM slips WHERE merchant_id = $1`

	var count int
	if err := r.db.QueryRow(query, merchantID).Scan(&count); err != nil {
		return 0, fmt.Errorf("failed to count slips: %w", err)
	}

	return count, nil
}

// GetStatsByMerchantID retrieves aggregate verification stats for a merchant.
func (r *slipRepository) GetStatsByMerchantID(merchantID uuid.UUID) (*models.SlipStatsResponse, error) {
	query := `
		SELECT
			COUNT(*)::int AS total,
			COUNT(*) FILTER (WHERE status = 'verified')::int AS verified,
			COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
			COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
			COUNT(*) FILTER (WHERE status = 'processing')::int AS processing
		FROM slips
		WHERE merchant_id = $1
	`

	stats := &models.SlipStatsResponse{}
	err := r.db.QueryRow(query, merchantID).Scan(
		&stats.Total,
		&stats.Verified,
		&stats.Failed,
		&stats.Pending,
		&stats.Processing,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get slip stats: %w", err)
	}

	completed := stats.Verified + stats.Failed
	if completed > 0 {
		stats.SuccessRate = int(float64(stats.Verified)/float64(completed)*100 + 0.5)
	}

	return stats, nil
}

// GetDailyStatsByMerchantID retrieves daily verified/failed counts for the last N days.
func (r *slipRepository) GetDailyStatsByMerchantID(merchantID uuid.UUID, days int) ([]models.DailySlipStats, error) {
	if days < 1 {
		days = 7
	}

	query := `
		WITH dates AS (
			SELECT generate_series(
				CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day'),
				CURRENT_DATE,
				INTERVAL '1 day'
			)::date AS day
		)
		SELECT
			TO_CHAR(dates.day, 'Dy') AS day,
			COUNT(s.id) FILTER (WHERE s.status = 'verified')::int AS verified,
			COUNT(s.id) FILTER (WHERE s.status = 'failed')::int AS failed
		FROM dates
		LEFT JOIN slips s
			ON s.merchant_id = $1
			AND s.created_at::date = dates.day
		GROUP BY dates.day
		ORDER BY dates.day ASC
	`

	rows, err := r.db.Query(query, merchantID, days)
	if err != nil {
		return nil, fmt.Errorf("failed to get daily slip stats: %w", err)
	}
	defer rows.Close()

	stats := make([]models.DailySlipStats, 0, days)
	for rows.Next() {
		var stat models.DailySlipStats
		if err := rows.Scan(&stat.Day, &stat.Verified, &stat.Failed); err != nil {
			return nil, err
		}
		stats = append(stats, stat)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return stats, nil
}

// UpdateStatus updates the status of a slip
func (r *slipRepository) UpdateStatus(id uuid.UUID, status models.SlipStatus) error {
	query := `
		UPDATE slips
		SET status = $1, updated_at = $2
		WHERE id = $3
	`

	_, err := r.db.Exec(query, status, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to update slip status: %w", err)
	}

	return nil
}

// UpdateWithTransaction updates slip and links transaction
func (r *slipRepository) UpdateWithTransaction(slip *models.Slip, transaction *models.Transaction) error {
	query := `
		UPDATE slips
		SET status = $1, fail_reason = $2,
			processing_started_at = $3,
			processing_completed_at = $4,
			updated_at = $5
		WHERE id = $6
	`

	_, err := r.db.Exec(
		query,
		slip.Status, slip.FailReason, slip.ProcessingStartedAt,
		slip.ProcessingCompletedAt, time.Now(), slip.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update slip: %w", err)
	}

	return nil
}

// CountByMerchantAndDate counts slips for a merchant on a specific date
func (r *slipRepository) CountByMerchantAndDate(merchantID uuid.UUID, date time.Time) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM slips
		WHERE merchant_id = $1
			AND DATE(created_at) = $2
	`

	var count int
	err := r.db.QueryRow(query, merchantID, date).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count slips: %w", err)
	}

	return count, nil
}

// CheckDuplicate checks if a similar slip exists within the given hours (excluding the specified slip ID)
func (r *slipRepository) CheckDuplicate(merchantID uuid.UUID, qrData string, withinHours int, excludeID uuid.UUID) (*models.Slip, error) {
	query := `
		SELECT id, merchant_id, image_url, qr_raw_data, status, fail_reason,
			processing_started_at, processing_completed_at, created_at, updated_at
		FROM slips
		WHERE merchant_id = $1
			AND qr_raw_data = $2
			AND id != $3
			AND created_at > NOW() - INTERVAL '1 hour' * $4
		ORDER BY created_at DESC
		LIMIT 1
	`

	slip := &models.Slip{}
	err := r.db.QueryRow(query, merchantID, qrData, excludeID, withinHours).Scan(
		&slip.ID, &slip.MerchantID, &slip.ImageURL, &slip.QRRawData, &slip.Status,
		&slip.FailReason, &slip.ProcessingStartedAt, &slip.ProcessingCompletedAt,
		&slip.CreatedAt, &slip.UpdatedAt,
	)

	if err != nil {
		return nil, nil // No duplicate found
	}

	return slip, nil
}
