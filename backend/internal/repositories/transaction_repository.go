package repositories

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
)

// ErrDuplicateReferenceNo is returned when a transaction reference already exists.
var ErrDuplicateReferenceNo = errors.New("duplicate transaction reference number")

// transactionColumns lists the columns selected by every scanTransaction call, in order.
const transactionColumns = `
	id, slip_id, merchant_id, reference_no, amount,
	sender_bank, sender_account, receiver_bank, receiver_account,
	transfer_at, transaction_date, transaction_time,
	status, is_duplicate, fail_reason, recheck_count, last_rechecked_at,
	created_at, updated_at
`

// scannable is satisfied by both *sql.Row and *sql.Rows.
type scannable interface {
	Scan(dest ...interface{}) error
}

// scanTransaction scans one transactionColumns row. reference_no, sender_bank,
// sender_account, receiver_bank and receiver_account are nullable in the DB
// (e.g. a failed slip that couldn't be parsed has no bank/reference data), so
// they're scanned via sql.NullString and coerced to "" rather than into the
// model's plain string fields directly — scanning SQL NULL into a non-pointer
// string panics/errors.
func scanTransaction(s scannable) (*models.Transaction, error) {
	transaction := &models.Transaction{}
	var referenceNo, senderBank, senderAccount, receiverBank, receiverAccount sql.NullString

	err := s.Scan(
		&transaction.ID, &transaction.SlipID, &transaction.MerchantID, &referenceNo, &transaction.Amount,
		&senderBank, &senderAccount, &receiverBank, &receiverAccount,
		&transaction.TransferAt, &transaction.TransactionDate, &transaction.TransactionTime,
		&transaction.Status, &transaction.IsDuplicate, &transaction.FailReason,
		&transaction.RecheckCount, &transaction.LastRecheckedAt,
		&transaction.CreatedAt, &transaction.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	transaction.ReferenceNo = referenceNo.String
	transaction.SenderBank = senderBank.String
	transaction.SenderAccount = senderAccount.String
	transaction.ReceiverBank = receiverBank.String
	transaction.ReceiverAccount = receiverAccount.String

	return transaction, nil
}

// TransactionRepository handles transaction database operations
type TransactionRepository interface {
	Create(transaction *models.Transaction) error
	FindByID(id uuid.UUID) (*models.Transaction, error)
	FindBySlipID(slipID uuid.UUID) (*models.Transaction, error)
	FindByReferenceNo(referenceNo string) (*models.Transaction, error)
	FindByMerchantID(merchantID uuid.UUID, limit, offset int) ([]*models.Transaction, error)
	ListByMerchant(merchantID uuid.UUID, filters models.TransactionFilters) ([]*models.Transaction, error)
	CountByMerchant(merchantID uuid.UUID, filters models.TransactionFilters) (int, error)
	UpdateStatus(id uuid.UUID, status models.TransactionStatus) error
	IncrementRecheckCount(id uuid.UUID) error
	CheckDuplicate(merchantID uuid.UUID, referenceNo string, amount float64, withinHours int) (*models.Transaction, error)
	CountByMerchantAndDate(merchantID uuid.UUID, date time.Time) (int, error)
}

type transactionRepository struct {
	db *sql.DB
}

// NewTransactionRepository creates a new transaction repository
func NewTransactionRepository(db *sql.DB) TransactionRepository {
	return &transactionRepository{db: db}
}

// Create inserts a new transaction record
func (r *transactionRepository) Create(transaction *models.Transaction) error {
	query := `
		INSERT INTO transactions (
			id, slip_id, merchant_id, reference_no, amount,
			sender_bank, sender_account, receiver_bank, receiver_account,
			transfer_at, transaction_date, transaction_time,
			status, is_duplicate, fail_reason,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		ON CONFLICT (reference_no) DO NOTHING
		RETURNING id
	`

	err := r.db.QueryRow(
		query,
		transaction.ID, transaction.SlipID, transaction.MerchantID, transaction.ReferenceNo, transaction.Amount,
		transaction.SenderBank, transaction.SenderAccount, transaction.ReceiverBank, transaction.ReceiverAccount,
		transaction.TransferAt, transaction.TransactionDate, transaction.TransactionTime,
		transaction.Status, transaction.IsDuplicate, transaction.FailReason,
		transaction.CreatedAt, transaction.UpdatedAt,
	).Scan(&transaction.ID)

	if errors.Is(err, sql.ErrNoRows) {
		return ErrDuplicateReferenceNo
	}
	if err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}

	return nil
}

// FindByID retrieves a transaction by ID
func (r *transactionRepository) FindByID(id uuid.UUID) (*models.Transaction, error) {
	query := `SELECT ` + transactionColumns + ` FROM transactions WHERE id = $1`
	return scanTransaction(r.db.QueryRow(query, id))
}

// FindBySlipID retrieves a transaction by slip ID
func (r *transactionRepository) FindBySlipID(slipID uuid.UUID) (*models.Transaction, error) {
	query := `SELECT ` + transactionColumns + ` FROM transactions WHERE slip_id = $1`
	return scanTransaction(r.db.QueryRow(query, slipID))
}

// FindByReferenceNo retrieves a transaction by reference number
func (r *transactionRepository) FindByReferenceNo(referenceNo string) (*models.Transaction, error) {
	query := `SELECT ` + transactionColumns + ` FROM transactions WHERE reference_no = $1 ORDER BY created_at DESC LIMIT 1`
	return scanTransaction(r.db.QueryRow(query, referenceNo))
}

// FindByMerchantID retrieves transactions for a merchant with pagination
func (r *transactionRepository) FindByMerchantID(merchantID uuid.UUID, limit, offset int) ([]*models.Transaction, error) {
	return r.ListByMerchant(merchantID, models.TransactionFilters{Limit: limit, Offset: offset})
}

// ListByMerchant retrieves filtered transactions for a merchant with pagination.
func (r *transactionRepository) ListByMerchant(merchantID uuid.UUID, filters models.TransactionFilters) ([]*models.Transaction, error) {
	where, args := buildTransactionFilterWhere(merchantID, filters)
	args = append(args, filters.Limit, filters.Offset)

	query := fmt.Sprintf(`
		SELECT %s
		FROM transactions
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, transactionColumns, where, len(args)-1, len(args))

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*models.Transaction
	for rows.Next() {
		txn, err := scanTransaction(rows)
		if err != nil {
			return nil, err
		}
		transactions = append(transactions, txn)
	}

	return transactions, nil
}

// CountByMerchant counts filtered transactions for a merchant.
func (r *transactionRepository) CountByMerchant(merchantID uuid.UUID, filters models.TransactionFilters) (int, error) {
	where, args := buildTransactionFilterWhere(merchantID, filters)
	query := fmt.Sprintf(`SELECT COUNT(*) FROM transactions %s`, where)

	var total int
	if err := r.db.QueryRow(query, args...).Scan(&total); err != nil {
		return 0, fmt.Errorf("failed to count transactions: %w", err)
	}

	return total, nil
}

func buildTransactionFilterWhere(merchantID uuid.UUID, filters models.TransactionFilters) (string, []interface{}) {
	conditions := []string{"merchant_id = $1"}
	args := []interface{}{merchantID}

	if filters.Status != nil {
		args = append(args, *filters.Status)
		conditions = append(conditions, fmt.Sprintf("status = $%d", len(args)))
	}

	if filters.StartDate != nil {
		args = append(args, *filters.StartDate)
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", len(args)))
	}

	if filters.EndDate != nil {
		endExclusive := filters.EndDate.AddDate(0, 0, 1)
		args = append(args, endExclusive)
		conditions = append(conditions, fmt.Sprintf("created_at < $%d", len(args)))
	}

	if strings.TrimSpace(filters.Search) != "" {
		args = append(args, "%"+strings.TrimSpace(filters.Search)+"%")
		searchParam := len(args)
		conditions = append(conditions, fmt.Sprintf(`(
			reference_no ILIKE $%d
			OR sender_bank ILIKE $%d
			OR sender_account ILIKE $%d
			OR receiver_bank ILIKE $%d
			OR receiver_account ILIKE $%d
			OR amount::text ILIKE $%d
		)`, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam))
	}

	return "WHERE " + strings.Join(conditions, " AND "), args
}

// UpdateStatus updates the status of a transaction
func (r *transactionRepository) UpdateStatus(id uuid.UUID, status models.TransactionStatus) error {
	query := `
		UPDATE transactions
		SET status = $1, updated_at = $2
		WHERE id = $3
	`

	_, err := r.db.Exec(query, status, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to update transaction status: %w", err)
	}

	return nil
}

// IncrementRecheckCount increments the recheck counter for a transaction
func (r *transactionRepository) IncrementRecheckCount(id uuid.UUID) error {
	query := `
		UPDATE transactions
		SET recheck_count = recheck_count + 1,
			last_rechecked_at = $1,
			updated_at = $1
		WHERE id = $2
	`

	_, err := r.db.Exec(query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to increment recheck count: %w", err)
	}

	return nil
}

// CheckDuplicate checks if a duplicate transaction exists
func (r *transactionRepository) CheckDuplicate(merchantID uuid.UUID, referenceNo string, amount float64, withinHours int) (*models.Transaction, error) {
	query := `SELECT ` + transactionColumns + `
		FROM transactions
		WHERE merchant_id = $1
			AND reference_no = $2
			AND amount = $3
			AND created_at > NOW() - INTERVAL '1 hour' * $4
		ORDER BY created_at DESC
		LIMIT 1
	`

	transaction, err := scanTransaction(r.db.QueryRow(query, merchantID, referenceNo, amount, withinHours))
	if err != nil {
		return nil, nil // No duplicate found
	}

	return transaction, nil
}

// CountByMerchantAndDate counts transactions for a merchant on a specific date
func (r *transactionRepository) CountByMerchantAndDate(merchantID uuid.UUID, date time.Time) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM transactions
		WHERE merchant_id = $1
			AND DATE(created_at) = $2
	`

	var count int
	err := r.db.QueryRow(query, merchantID, date).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count transactions: %w", err)
	}

	return count, nil
}
