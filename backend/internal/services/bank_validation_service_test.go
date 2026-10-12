package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"slipsure-backend/internal/models"

	"github.com/google/uuid"
)

func TestMockValidateTransactionRequiresReferenceAndAmount(t *testing.T) {
	service := &BankValidationService{}
	merchantID := uuid.New()

	tests := []struct {
		name string
		data *models.EMVCoData
	}{
		{
			name: "missing reference",
			data: &models.EMVCoData{TransactionAmount: 100},
		},
		{
			name: "missing amount",
			data: &models.EMVCoData{ReferenceNumber: "REF1234567890"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := service.mockValidateTransaction(tt.data, merchantID); err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
}

func TestHaveSlipValidateTransactionSendsQRCodeAndMapsResponse(t *testing.T) {
	var capturedAuth string
	var capturedRequest haveSlipVerifyRequest

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s, want POST", r.Method)
		}
		if r.URL.Path != "/verify" {
			t.Fatalf("path = %s, want /verify", r.URL.Path)
		}
		capturedAuth = r.Header.Get("Authorization")
		if r.Header.Get("Idempotency-Key") == "" {
			t.Fatal("missing idempotency key")
		}
		if err := json.NewDecoder(r.Body).Decode(&capturedRequest); err != nil {
			t.Fatalf("decode request: %v", err)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"success": true,
			"data": {
				"uuid": "ver_test_123",
				"status": "completed",
				"result": {
					"valid": true,
					"transactionData": {
						"amount": 123.45,
						"receiver": { "name": "Shop", "bank": "SCB", "account": "xxx-1" },
						"sender": { "name": "Customer", "bank": "KBank", "account": "xxx-2" },
						"transactionDate": "2026-10-06T10:11:12Z"
					}
				},
				"duplicate": false,
				"chargedCredits": 1
			}
		}`))
	}))
	defer server.Close()

	service := &BankValidationService{
		apiKey:   "test-key",
		apiURL:   server.URL,
		provider: "haveslip",
		client:   server.Client(),
	}

	transaction, err := service.ValidateTransaction(&models.EMVCoData{
		QRRawData:         "00020101021229TEST",
		ReferenceNumber:   "REF1234567890",
		TransactionAmount: 100,
	}, uuid.New())
	if err != nil {
		t.Fatalf("validate with haveslip: %v", err)
	}

	if capturedAuth != "Bearer test-key" {
		t.Fatalf("auth header = %q, want bearer key", capturedAuth)
	}
	if capturedRequest.InputType != "qr_string" {
		t.Fatalf("input type = %s, want qr_string", capturedRequest.InputType)
	}
	if capturedRequest.InputData != "00020101021229TEST" {
		t.Fatalf("input data = %s, want raw QR", capturedRequest.InputData)
	}
	if capturedRequest.Mode != "sync" {
		t.Fatalf("mode = %s, want sync", capturedRequest.Mode)
	}
	if transaction.ReferenceNo != "REF1234567890" {
		t.Fatalf("reference = %s, want parsed reference", transaction.ReferenceNo)
	}
	if transaction.Amount != 123.45 {
		t.Fatalf("amount = %.2f, want 123.45", transaction.Amount)
	}
	if transaction.SenderBank != "KBank" || transaction.ReceiverBank != "SCB" {
		t.Fatalf("banks = %s -> %s, want KBank -> SCB", transaction.SenderBank, transaction.ReceiverBank)
	}
	if transaction.Status != models.TransactionStatusSuccess {
		t.Fatalf("status = %s, want success", transaction.Status)
	}
}

func TestHaveSlipValidateTransactionRejectsInvalidResult(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"success": true,
			"data": {
				"uuid": "ver_test_123",
				"status": "completed",
				"result": { "valid": false }
			}
		}`))
	}))
	defer server.Close()

	service := &BankValidationService{
		apiKey:   "test-key",
		apiURL:   server.URL,
		provider: "haveslip",
		client:   server.Client(),
	}

	_, err := service.ValidateTransaction(&models.EMVCoData{
		QRRawData:         "00020101021229TEST",
		ReferenceNumber:   "REF1234567890",
		TransactionAmount: 100,
	}, uuid.New())
	if err == nil {
		t.Fatal("expected invalid result error")
	}
}

func TestMockValidateTransactionAcceptsParsedReferenceAndAmount(t *testing.T) {
	service := &BankValidationService{}
	merchantID := uuid.New()

	transaction, err := service.mockValidateTransaction(&models.EMVCoData{
		ReferenceNumber:   "REF1234567890",
		TransactionAmount: 500.25,
	}, merchantID)
	if err != nil {
		t.Fatalf("mock validate transaction: %v", err)
	}

	if transaction.Status != models.TransactionStatusSuccess {
		t.Fatalf("status = %s, want %s", transaction.Status, models.TransactionStatusSuccess)
	}
	if transaction.ReferenceNo != "REF1234567890" {
		t.Fatalf("reference = %s, want REF1234567890", transaction.ReferenceNo)
	}
	if transaction.Amount != 500.25 {
		t.Fatalf("amount = %.2f, want 500.25", transaction.Amount)
	}
}
