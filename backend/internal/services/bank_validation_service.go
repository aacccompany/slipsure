package services

import (
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
)

// BankValidationService handles bank API validation
type BankValidationService struct {
	mockMode bool
	apiKey   string
	apiURL   string
}

// NewBankValidationService creates a new bank validation service
func NewBankValidationService() *BankValidationService {
	mockMode := os.Getenv("KBANK_MOCK_MODE") == "true"

	return &BankValidationService{
		mockMode: mockMode,
		apiKey:   os.Getenv("K_API_KEY"),
		apiURL:   os.Getenv("KBANK_API_URL"),
	}
}

// ValidateTransaction validates a transaction with the bank
func (s *BankValidationService) ValidateTransaction(emvData *models.EMVCoData, merchantID uuid.UUID) (*models.Transaction, error) {
	if s.mockMode {
		return s.mockValidateTransaction(emvData, merchantID)
	}

	// Real bank validation (to be implemented when API access is available)
	return nil, fmt.Errorf("real bank validation not yet implemented")
}

// mockValidateTransaction simulates bank validation for testing
func (s *BankValidationService) mockValidateTransaction(emvData *models.EMVCoData, merchantID uuid.UUID) (*models.Transaction, error) {
	// Simulate API delay
	time.Sleep(time.Duration(200+rand.Intn(300)) * time.Millisecond)

	if emvData.ReferenceNumber == "" {
		return nil, fmt.Errorf("mock bank validation failed: missing transaction reference")
	}

	if emvData.TransactionAmount <= 0 {
		return nil, fmt.Errorf("mock bank validation failed: missing transaction amount")
	}

	// Generate mock transaction data
	now := time.Now()
	transferTime := now.Add(-time.Duration(rand.Intn(60)) * time.Minute)

	// Thai banks for mock data
	banks := []string{"KBANK", "SCB", "KTB", "BBL", "AYA", "TMB", "CIMB"}
	senderBank := banks[rand.Intn(len(banks))]

	// Generate account number (mock format: xxx-x-xxxxx-x)
	accountNum := fmt.Sprintf("%03d-%d-%05d-%d",
		rand.Intn(999),
		rand.Intn(9),
		rand.Intn(99999),
		rand.Intn(9),
	)

	transaction := &models.Transaction{
		ID:              uuid.New(),
		MerchantID:      merchantID,
		ReferenceNo:     emvData.ReferenceNumber,
		Amount:          emvData.TransactionAmount,
		SenderBank:      senderBank,
		SenderAccount:   accountNum,
		ReceiverBank:    "KBANK", // Assume merchant uses KBANK
		ReceiverAccount: "xxx-x-xxxxx-x",
		TransferAt:      &transferTime,
		TransactionDate: &transferTime,
		TransactionTime: &transferTime,
		Status:          models.TransactionStatusSuccess,
		IsDuplicate:     false,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	// Update transaction with validated data
	transaction.ReferenceNo = emvData.ReferenceNumber
	transaction.Amount = emvData.TransactionAmount

	// Remove random failures for testing - always success
	log.Printf("Mock bank validation: SUCCESS for ref=%s, amount=%.2f", emvData.ReferenceNumber, emvData.TransactionAmount)

	return transaction, nil
}

// GetBankStatus returns the status of bank APIs
func (s *BankValidationService) GetBankStatus() ([]BankStatus, error) {
	if s.mockMode {
		return []BankStatus{
			{
				BankCode:         "KBANK",
				BankName:         "Kasikornbank",
				Status:           "operational",
				ResponseTimeMs:   320 + rand.Intn(100),
				LastCheck:        time.Now(),
				ValidationSource: "mock",
			},
			{
				BankCode:         "SCB",
				BankName:         "Siam Commercial Bank",
				Status:           "operational",
				ResponseTimeMs:   410 + rand.Intn(100),
				LastCheck:        time.Now(),
				ValidationSource: "mock",
			},
		}, nil
	}

	// Real bank status check (to be implemented)
	return nil, fmt.Errorf("real bank status check not yet implemented")
}

// SyncPendingTransactions syncs pending transactions with bank API
func (s *BankValidationService) SyncPendingTransactions(merchantID uuid.UUID) (*SyncResult, error) {
	if s.mockMode {
		// Simulate sync operation
		time.Sleep(500 * time.Millisecond)

		return &SyncResult{
			SyncID:        uuid.New().String(),
			PendingCount:  rand.Intn(20),
			EstimatedTime: 30,
		}, nil
	}

	return nil, fmt.Errorf("real sync not yet implemented")
}

// BankStatus represents bank API status
type BankStatus struct {
	BankCode         string    `json:"bank_code"`
	BankName         string    `json:"bank_name"`
	Status           string    `json:"status"`
	ResponseTimeMs   int       `json:"response_time_ms"`
	LastCheck        time.Time `json:"last_check"`
	ValidationSource string    `json:"validation_source"`
}

// SyncResult represents sync operation result
type SyncResult struct {
	SyncID        string `json:"sync_id"`
	PendingCount  int    `json:"pending_count"`
	EstimatedTime int    `json:"estimated_time"`
}
