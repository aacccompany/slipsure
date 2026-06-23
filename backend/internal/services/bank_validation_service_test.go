package services

import (
	"testing"

	"slipsure-backend/internal/models"

	"github.com/google/uuid"
)

func TestMockValidateTransactionRequiresReferenceAndAmount(t *testing.T) {
	service := &BankValidationService{mockMode: true}
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

func TestMockValidateTransactionAcceptsParsedReferenceAndAmount(t *testing.T) {
	service := &BankValidationService{mockMode: true}
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
