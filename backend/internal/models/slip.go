package models

import (
	"time"

	"github.com/google/uuid"
)

// Slip represents a slip verification record
type Slip struct {
	ID                    uuid.UUID   `json:"id" db:"id"`
	MerchantID            uuid.UUID   `json:"merchant_id" db:"merchant_id"`
	ImageURL              string      `json:"image_url" db:"image_url"`
	QRRawData             string      `json:"qr_raw_data,omitempty" db:"qr_raw_data"`
	Status                SlipStatus  `json:"status" db:"status"`
	FailReason            *FailReason `json:"fail_reason,omitempty" db:"fail_reason"`
	ProcessingStartedAt   *time.Time  `json:"processing_started_at,omitempty" db:"processing_started_at"`
	ProcessingCompletedAt *time.Time  `json:"processing_completed_at,omitempty" db:"processing_completed_at"`
	CreatedAt             time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time   `json:"updated_at" db:"updated_at"`

	// Relations
	Transaction *Transaction `json:"transaction,omitempty"`
}

// SlipStatus represents slip verification status
type SlipStatus string

const (
	SlipStatusPending    SlipStatus = "pending"
	SlipStatusProcessing SlipStatus = "processing"
	SlipStatusVerified   SlipStatus = "verified"
	SlipStatusFailed     SlipStatus = "failed"
)

// FailReason represents slip failure reasons
type FailReason string

const (
	FailReasonDuplicateSlip  FailReason = "DUPLICATE_SLIP"
	FailReasonAmountMismatch FailReason = "AMOUNT_MISMATCH"
	FailReasonTimeout        FailReason = "TIMEOUT"
	FailReasonInvalidQR      FailReason = "INVALID_QR"
	FailReasonBankError      FailReason = "BANK_ERROR"
	FailReasonExpiredSlip    FailReason = "EXPIRED_SLIP"
)

// SlipStatsResponse represents aggregate slip verification stats for a merchant.
type SlipStatsResponse struct {
	Total       int              `json:"total"`
	Verified    int              `json:"verified"`
	Failed      int              `json:"failed"`
	Pending     int              `json:"pending"`
	Processing  int              `json:"processing"`
	SuccessRate int              `json:"success_rate"`
	Last7Days   []DailySlipStats `json:"last_7_days"`
}

// DailySlipStats represents one day of slip verification counts.
type DailySlipStats struct {
	Day      string `json:"day"`
	Verified int    `json:"verified"`
	Failed   int    `json:"failed"`
}

// VerificationResponse represents verification result
type VerificationResponse struct {
	SlipID      uuid.UUID       `json:"slip_id"`
	Status      SlipStatus      `json:"status"`
	Transaction *Transaction    `json:"transaction,omitempty"`
	Validation  *ValidationInfo `json:"validation,omitempty"`
	FailReason  *FailReason     `json:"fail_reason,omitempty"`
}

// ValidationInfo represents validation details
type ValidationInfo struct {
	TimeWindowOK         bool   `json:"time_window_ok"`
	BankFormatOK         bool   `json:"bank_format_ok"`
	Duplicate            bool   `json:"duplicate"`
	ReceiverAccountMatch bool   `json:"receiver_account_match"`
	ValidationSource     string `json:"validation_source"` // "bank_api" or "mock"
}
