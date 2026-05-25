package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"
)

// SlipVerificationService handles slip verification workflow
type SlipVerificationService struct {
	slipRepo        repositories.SlipRepository
	transactionRepo repositories.TransactionRepository
	usageRepo       repositories.UsageCounterRepository
	storage         *StorageService
	qrScanner       *QRScannerService
	bankValidator   *BankValidationService
	duplicateWindow int
}

// NewSlipVerificationService creates a new slip verification service
func NewSlipVerificationService(
	slipRepo repositories.SlipRepository,
	transactionRepo repositories.TransactionRepository,
	usageRepo repositories.UsageCounterRepository,
	storage *StorageService,
) *SlipVerificationService {
	return &SlipVerificationService{
		slipRepo:        slipRepo,
		transactionRepo: transactionRepo,
		usageRepo:       usageRepo,
		storage:         storage,
		qrScanner:       NewQRScannerService(),
		bankValidator:   NewBankValidationService(),
		duplicateWindow: 24, // Check for duplicates within 24 hours
	}
}

// UploadAndVerify uploads a slip image and starts verification process
func (s *SlipVerificationService) UploadAndVerify(ctx context.Context, merchantID uuid.UUID, imageData []byte, contentType string) (*models.Slip, error) {
	// Create slip record
	slip := &models.Slip{
		ID:         uuid.New(),
		MerchantID: merchantID,
		Status:     models.SlipStatusPending,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	// Upload image to DigitalOcean Spaces
	imageURL, err := s.storage.UploadSlipImage(imageData, slip.ID.String(), contentType)
	if err != nil {
		return nil, fmt.Errorf("failed to upload image to Spaces: %w", err)
	}
	slip.ImageURL = imageURL

	// Extract QR data from image
	qrData, err := s.qrScanner.ExtractFromBytes(imageData)
	if err != nil {
		log.Printf("Warning: Failed to extract QR from image: %v", err)

		// Fallback: Create slip with manual processing needed
		slip.Status = models.SlipStatusFailed
		reason := models.FailReasonInvalidQR
		slip.FailReason = &reason

		// Save slip with failed status
		err = s.slipRepo.Create(slip)
		if err != nil {
			return nil, fmt.Errorf("failed to create slip record: %w", err)
		}

		return slip, fmt.Errorf("failed to extract QR from image: %w", err)
	}
	slip.QRRawData = qrData

	// Save slip to database
	err = s.slipRepo.Create(slip)
	if err != nil {
		return nil, fmt.Errorf("failed to create slip record: %w", err)
	}

	// Start async verification
	go s.verifySlipAsync(slip)

	return slip, nil
}

// ScanQRData processes raw QR data and starts verification
func (s *SlipVerificationService) ScanQRData(merchantID uuid.UUID, qrData string) (*models.Slip, error) {
	// Validate QR data
	err := s.qrScanner.ValidateQRData(qrData)
	if err != nil {
		return nil, fmt.Errorf("invalid QR data: %w", err)
	}

	// Create slip record
	slip := &models.Slip{
		ID:        uuid.New(),
		MerchantID: merchantID,
		QRRawData: qrData,
		Status:    models.SlipStatusPending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Save to database
	err = s.slipRepo.Create(slip)
	if err != nil {
		return nil, fmt.Errorf("failed to create slip record: %w", err)
	}

	// Start async verification
	go s.verifySlipAsync(slip)

	return slip, nil
}

// verifySlipAsync runs the verification process asynchronously
func (s *SlipVerificationService) verifySlipAsync(slip *models.Slip) {
	// Update status to processing
	_ = s.slipRepo.UpdateStatus(slip.ID, models.SlipStatusProcessing)

	now := time.Now()
	slip.ProcessingStartedAt = &now

	// Parse QR data
	emvData, err := s.qrScanner.ParseEMVCoData(slip.QRRawData)
	if err != nil {
		s.markAsFailed(slip, models.FailReasonInvalidQR, err.Error())
		return
	}

	// Check for duplicates (excluding current slip)
	duplicateSlip, err := s.slipRepo.CheckDuplicate(slip.MerchantID, slip.QRRawData, s.duplicateWindow, slip.ID)
	if err == nil && duplicateSlip != nil {
		s.markAsFailed(slip, models.FailReasonDuplicateSlip, "Duplicate slip found")
		return
	}

	// Validate with bank
	transaction, err := s.bankValidator.ValidateTransaction(emvData, slip.MerchantID)
	if err != nil {
		s.markAsFailed(slip, models.FailReasonBankError, err.Error())
		return
	}

	// Check for duplicate transaction
	duplicateTxn, err := s.transactionRepo.CheckDuplicate(
		slip.MerchantID,
		transaction.ReferenceNo,
		transaction.Amount,
		s.duplicateWindow,
	)
	if err == nil && duplicateTxn != nil {
		transaction.IsDuplicate = true
	}

	// Link transaction to slip
	transaction.SlipID = slip.ID
	err = s.transactionRepo.Create(transaction)
	if err != nil {
		s.markAsFailed(slip, models.FailReasonBankError, "Failed to create transaction record")
		return
	}

	// Update slip status
	completedAt := time.Now()
	slip.ProcessingCompletedAt = &completedAt

	if transaction.Status == models.TransactionStatusSuccess {
		slip.Status = models.SlipStatusVerified
		s.slipRepo.UpdateWithTransaction(slip, transaction)

		// Increment usage counter
		now := time.Now()
		_ = s.usageRepo.IncrementUsage(slip.MerchantID, now.Year(), int(now.Month()))
	} else {
		slip.Status = models.SlipStatusFailed
		s.slipRepo.UpdateWithTransaction(slip, transaction)
	}
}

// GetSlip retrieves a slip by ID
func (s *SlipVerificationService) GetSlip(slipID uuid.UUID) (*models.Slip, error) {
	slip, err := s.slipRepo.FindByID(slipID)
	if err != nil {
		return nil, err
	}

	// Load transaction if exists
	if slip.Status == models.SlipStatusVerified {
		transaction, err := s.transactionRepo.FindBySlipID(slipID)
		if err == nil {
			slip.Transaction = transaction
		}
	}

	return slip, nil
}

// ReprocessSlip reprocesses a failed slip
func (s *SlipVerificationService) ReprocessSlip(slipID uuid.UUID, forceVerify bool) error {
	slip, err := s.slipRepo.FindByID(slipID)
	if err != nil {
		return err
	}

	if slip.Status == models.SlipStatusProcessing {
		return fmt.Errorf("slip is already being processed")
	}

	// Reset status
	slip.Status = models.SlipStatusPending
	slip.ProcessingStartedAt = nil
	slip.ProcessingCompletedAt = nil
	slip.FailReason = nil

	err = s.slipRepo.UpdateStatus(slip.ID, models.SlipStatusPending)
	if err != nil {
		return err
	}

	// Start verification again
	go s.verifySlipAsync(slip)

	return nil
}

// markAsFailed marks a slip as failed with a reason
func (s *SlipVerificationService) markAsFailed(slip *models.Slip, reason models.FailReason, message string) {
	completedAt := time.Now()
	slip.Status = models.SlipStatusFailed
	slip.ProcessingCompletedAt = &completedAt
	slip.FailReason = &reason

	_ = s.slipRepo.UpdateWithTransaction(slip, nil)
}
