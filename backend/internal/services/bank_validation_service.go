package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
)

// BankValidationService handles bank API validation
type BankValidationService struct {
	apiKey   string
	apiURL   string
	provider string
	client   *http.Client
}

// NewBankValidationService creates a new bank validation service
func NewBankValidationService() *BankValidationService {
	provider := strings.ToLower(getBankEnv("SLIP_VALIDATION_PROVIDER", "haveslip"))
	apiURL := os.Getenv("HAVESLIP_API_URL")
	if apiURL == "" {
		apiURL = "https://api.haveslip.com/api"
	}

	return &BankValidationService{
		apiKey:   os.Getenv("HAVESLIP_API_KEY"),
		apiURL:   apiURL,
		provider: provider,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

// ValidateTransaction validates a transaction with the bank
func (s *BankValidationService) ValidateTransaction(emvData *models.EMVCoData, merchantID uuid.UUID) (*models.Transaction, error) {
	if s.provider == "haveslip" {
		return s.validateWithHaveSlip(emvData, merchantID)
	}

	return nil, fmt.Errorf("unsupported slip validation provider: %s", s.provider)
}

func (s *BankValidationService) validateWithHaveSlip(emvData *models.EMVCoData, merchantID uuid.UUID) (*models.Transaction, error) {
	if strings.TrimSpace(s.apiURL) == "" || strings.TrimSpace(s.apiKey) == "" {
		return nil, fmt.Errorf("HaveSLIP validation is not configured")
	}
	if strings.TrimSpace(emvData.QRRawData) == "" {
		return nil, fmt.Errorf("HaveSLIP validation failed: missing QR data")
	}

	requestBody := haveSlipVerifyRequest{
		InputType: "qr_string",
		InputData: emvData.QRRawData,
		Mode:      "sync",
	}

	body, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to encode HaveSLIP request: %w", err)
	}

	endpoint := strings.TrimRight(s.apiURL, "/") + "/verify"
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create HaveSLIP request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", uuid.NewString())

	client := s.client
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HaveSLIP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("failed to read HaveSLIP response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HaveSLIP validation failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var verifyResp haveSlipVerifyResponse
	if err := json.Unmarshal(respBody, &verifyResp); err != nil {
		return nil, fmt.Errorf("failed to parse HaveSLIP response: %w", err)
	}

	if !verifyResp.Success {
		message := verifyResp.Message
		if message == "" {
			message = verifyResp.Error
		}
		if message == "" {
			message = "verification failed"
		}
		return nil, fmt.Errorf("HaveSLIP validation failed: %s", message)
	}
	if strings.EqualFold(verifyResp.Data.Status, "failed") {
		return nil, fmt.Errorf("HaveSLIP validation failed")
	}
	if !verifyResp.Data.Result.Valid {
		return nil, fmt.Errorf("HaveSLIP validation rejected slip")
	}

	txnData := verifyResp.Data.Result.TransactionData
	amount := txnData.Amount
	if amount <= 0 {
		amount = emvData.TransactionAmount
	}
	if amount <= 0 {
		return nil, fmt.Errorf("HaveSLIP validation returned missing amount")
	}

	referenceNo := emvData.ReferenceNumber
	if referenceNo == "" {
		referenceNo = verifyResp.Data.UUID
	}
	if referenceNo == "" {
		return nil, fmt.Errorf("HaveSLIP validation returned missing reference")
	}

	transferAt := parseHaveSlipTime(txnData.TransactionDate)
	if transferAt == nil {
		now := time.Now()
		transferAt = &now
	}

	now := time.Now()
	transaction := &models.Transaction{
		ID:                     uuid.New(),
		MerchantID:             merchantID,
		ReferenceNo:            referenceNo,
		Amount:                 amount,
		SenderBank:             txnData.Sender.Bank,
		SenderAccount:          txnData.Sender.Account,
		ReceiverBank:           txnData.Receiver.Bank,
		ReceiverAccount:        txnData.Receiver.Account,
		TransferAt:             transferAt,
		TransactionDate:        transferAt,
		TransactionTime:        transferAt,
		Status:                 models.TransactionStatusSuccess,
		IsDuplicate:            verifyResp.Data.Duplicate,
		Provider:               "haveslip",
		ProviderVerificationID: verifyResp.Data.UUID,
		ProviderStatus:         verifyResp.Data.Status,
		ProviderValid:          verifyResp.Data.Result.Valid,
		ProviderCached:         verifyResp.Data.IsCached,
		ProviderChargedCredits: verifyResp.Data.ChargedCredits,
		SenderName:             txnData.Sender.Name,
		ReceiverName:           txnData.Receiver.Name,
		ProviderResponse:       append([]byte(nil), respBody...),
		CreatedAt:              now,
		UpdatedAt:              now,
	}

	log.Printf("HaveSLIP validation: SUCCESS for ref=%s, amount=%.2f, duplicate=%t", referenceNo, amount, verifyResp.Data.Duplicate)
	return transaction, nil
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

	// Thai banks for mock sender data
	banks := []string{"SCB", "KTB", "BBL", "AYA", "TTB", "CIMB"}
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
		ReceiverBank:    "SCB",
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
	log.Printf("Mock SCB bank validation: SUCCESS for ref=%s, amount=%.2f", emvData.ReferenceNumber, emvData.TransactionAmount)

	return transaction, nil
}

// GetBankStatus returns the status of bank APIs
func (s *BankValidationService) GetBankStatus() ([]BankStatus, error) {
	if s.apiURL == "" || s.apiKey == "" {
		return nil, fmt.Errorf("HaveSLIP validation is not configured")
	}

	return []BankStatus{
		{
			BankCode:         "HAVESLIP",
			BankName:         "HaveSLIP",
			Status:           "configured",
			ResponseTimeMs:   0,
			LastCheck:        time.Now(),
			ValidationSource: "haveslip",
		},
	}, nil
}

// SyncPendingTransactions syncs pending transactions with bank API
func (s *BankValidationService) SyncPendingTransactions(merchantID uuid.UUID) (*SyncResult, error) {
	return nil, fmt.Errorf("transaction sync is not supported for provider: %s", s.provider)
}

func getBankEnv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
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

type haveSlipVerifyRequest struct {
	InputType string `json:"inputType"`
	InputData string `json:"inputData"`
	Mode      string `json:"mode"`
}

type haveSlipVerifyResponse struct {
	Success bool               `json:"success"`
	Error   string             `json:"error,omitempty"`
	Message string             `json:"message,omitempty"`
	Data    haveSlipVerifyData `json:"data"`
}

type haveSlipVerifyData struct {
	UUID                 string         `json:"uuid"`
	Status               string         `json:"status"`
	Result               haveSlipResult `json:"result"`
	Duplicate            bool           `json:"duplicate"`
	DuplicateOf          string         `json:"duplicateOf,omitempty"`
	DuplicateFirstSeenAt string         `json:"duplicateFirstSeenAt,omitempty"`
	ChargedCredits       int            `json:"chargedCredits,omitempty"`
	CreatedAt            string         `json:"createdAt,omitempty"`
	CompletedAt          string         `json:"completedAt,omitempty"`
	IsCached             bool           `json:"isCached,omitempty"`
}

type haveSlipResult struct {
	Valid           bool                    `json:"valid"`
	TransactionData haveSlipTransactionData `json:"transactionData"`
}

type haveSlipTransactionData struct {
	Amount          float64           `json:"amount"`
	Receiver        haveSlipBankParty `json:"receiver"`
	Sender          haveSlipBankParty `json:"sender"`
	TransactionDate string            `json:"transactionDate"`
}

type haveSlipBankParty struct {
	Name    string `json:"name,omitempty"`
	Bank    string `json:"bank,omitempty"`
	Account string `json:"account,omitempty"`
}

func parseHaveSlipTime(value string) *time.Time {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
	}
	for _, layout := range layouts {
		parsed, err := time.Parse(layout, value)
		if err == nil {
			return &parsed
		}
	}

	return nil
}
