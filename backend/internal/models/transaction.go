package models

import (
	"time"

	"github.com/google/uuid"
)

// Transaction represents a payment transaction extracted from slip
type Transaction struct {
	ID              uuid.UUID         `json:"id" db:"id"`
	SlipID          uuid.UUID         `json:"slip_id" db:"slip_id"`
	MerchantID      uuid.UUID         `json:"merchant_id" db:"merchant_id"`
	ReferenceNo     string            `json:"reference_no" db:"reference_no"`
	Amount          float64           `json:"amount" db:"amount"`
	SenderBank      string            `json:"sender_bank" db:"sender_bank"`
	SenderAccount   string            `json:"sender_account" db:"sender_account"`
	ReceiverBank    string            `json:"receiver_bank" db:"receiver_bank"`
	ReceiverAccount string            `json:"receiver_account" db:"receiver_account"`
	TransferAt      *time.Time        `json:"transfer_at" db:"transfer_at"`
	TransactionDate *time.Time        `json:"transaction_date" db:"transaction_date"`
	TransactionTime *time.Time        `json:"transaction_time" db:"transaction_time"`
	Status          TransactionStatus `json:"status" db:"status"`
	IsDuplicate     bool              `json:"is_duplicate" db:"is_duplicate"`
	FailReason      *string           `json:"fail_reason,omitempty" db:"fail_reason"`
	RecheckCount    int               `json:"recheck_count" db:"recheck_count"`
	LastRecheckedAt *time.Time        `json:"last_rechecked_at,omitempty" db:"last_rechecked_at"`
	CreatedAt       time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at" db:"updated_at"`

	// Relations
	Slip *Slip `json:"slip,omitempty"`
}

// TransactionStatus represents transaction status
type TransactionStatus string

const (
	TransactionStatusPending    TransactionStatus = "pending"
	TransactionStatusSuccess    TransactionStatus = "success"
	TransactionStatusFailed     TransactionStatus = "failed"
	TransactionStatusProcessing TransactionStatus = "processing"
)

// TransactionListResponse represents transaction list with pagination
type TransactionListResponse struct {
	Items      []Transaction `json:"items"`
	Pagination Pagination    `json:"pagination"`
}

// TransactionFilters represents merchant transaction list filters.
type TransactionFilters struct {
	Status    *TransactionStatus
	StartDate *time.Time
	EndDate   *time.Time
	Search    string
	Limit     int
	Offset    int
}

// TransactionDetailResponse represents single transaction detail
type TransactionDetailResponse struct {
	Transaction Transaction `json:"transaction"`
}

// EMVCoData represents parsed EMVCo QR data
type EMVCoData struct {
	QRRawData            string  `json:"qr_raw_data"`
	PayloadFormat        string  `json:"payload_format"`
	PointOfInitiation    string  `json:"point_of_initiation"`
	MerchantAccountInfo  string  `json:"merchant_account_info"`
	MerchantCategory     string  `json:"merchant_category"`
	TransactionCurrency  string  `json:"transaction_currency"`
	TransactionAmount    float64 `json:"transaction_amount"`
	BillNumber           string  `json:"bill_number,omitempty"`
	MobileNumber         string  `json:"mobile_number,omitempty"`
	StoreLabel           string  `json:"store_label,omitempty"`
	ReferenceNumber      string  `json:"reference_number"`
	CustomerLabel        string  `json:"customer_label,omitempty"`
	TerminalLabel        string  `json:"terminal_label,omitempty"`
	PurposeOfTransaction string  `json:"purpose_of_transaction,omitempty"`
	AdditionalData       string  `json:"additional_data,omitempty"`
}
