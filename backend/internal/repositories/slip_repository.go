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
