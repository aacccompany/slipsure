package repositories

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// UsageCounterRepository handles usage counter database operations
type UsageCounterRepository interface {
	GetUsage(merchantID uuid.UUID, year int, month int) (*UsageCounter, error)
	IncrementUsage(merchantID uuid.UUID, year int, month int) error
	CreateOrUpdate(merchantID uuid.UUID, year int, month int) error
}

type UsageCounter struct {
	ID            uuid.UUID `json:"id" db:"id"`
	MerchantID    uuid.UUID `json:"merchant_id" db:"merchant_id"`
	Year          int       `json:"year" db:"year"`
	Month         int       `json:"month" db:"month"`
	ScanCount     int       `json:"scan_count" db:"scan_count"`
	SuccessCount  int       `json:"success_count" db:"success_count"`
	FailedCount   int       `json:"failed_count" db:"failed_count"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

type usageCounterRepository struct {
	db *sql.DB
}

// NewUsageCounterRepository creates a new usage counter repository
func NewUsageCounterRepository(db *sql.DB) UsageCounterRepository {
	return &usageCounterRepository{db: db}
}

// GetUsage retrieves usage stats for a merchant
func (r *usageCounterRepository) GetUsage(merchantID uuid.UUID, year int, month int) (*UsageCounter, error) {
	query := `
		SELECT id, merchant_id, year, month, scan_count, success_count, failed_count, created_at, updated_at
		FROM usage_counters
		WHERE merchant_id = $1 AND year = $2 AND month = $3
	`

	counter := &UsageCounter{}
	err := r.db.QueryRow(query, merchantID, year, month).Scan(
		&counter.ID, &counter.MerchantID, &counter.Year, &counter.Month,
		&counter.ScanCount, &counter.SuccessCount, &counter.FailedCount,
		&counter.CreatedAt, &counter.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return counter, nil
}

// IncrementUsage increments the scan counter for a merchant
func (r *usageCounterRepository) IncrementUsage(merchantID uuid.UUID, year int, month int) error {
	query := `
		INSERT INTO usage_counters (merchant_id, year, month, scan_count, created_at, updated_at)
		VALUES ($1, $2, $3, 1, NOW(), NOW())
		ON CONFLICT (merchant_id, year, month)
		DO UPDATE SET
			scan_count = usage_counters.scan_count + 1,
			updated_at = NOW()
	`

	_, err := r.db.Exec(query, merchantID, year, month)
	if err != nil {
		return fmt.Errorf("failed to increment usage: %w", err)
	}

	return nil
}

// CreateOrUpdate creates or updates usage counter
func (r *usageCounterRepository) CreateOrUpdate(merchantID uuid.UUID, year int, month int) error {
	query := `
		INSERT INTO usage_counters (merchant_id, year, month, scan_count, success_count, failed_count, created_at, updated_at)
		VALUES ($1, $2, $3, 0, 0, 0, NOW(), NOW())
		ON CONFLICT (merchant_id, year, month)
		DO UPDATE SET
			updated_at = NOW()
	`

	_, err := r.db.Exec(query, merchantID, year, month)
	if err != nil {
		return fmt.Errorf("failed to create/update usage counter: %w", err)
	}

	return nil
}
