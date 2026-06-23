package services

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"
)

// LINEWebhookService handles LINE webhook operations for multi-merchant support
type LINEWebhookService struct {
	merchantRepo            repositories.MerchantRepository
	cryptoService           *CryptoService
	slipVerificationService *SlipVerificationService
	baseURL                 string
	lineUserIDs             map[uuid.UUID]string // Track LINE user IDs by slip ID for notifications
	lineUserIDsMutex        sync.RWMutex         // Protect lineUserIDs map from concurrent access
	processedLineMessages   map[string]time.Time
	processedMessagesMutex  sync.Mutex
}

// NewLINEWebhookService creates a new LINE webhook service
func NewLINEWebhookService(merchantRepo repositories.MerchantRepository, cryptoService *CryptoService, slipVerificationService *SlipVerificationService, baseURL string) *LINEWebhookService {
	service := &LINEWebhookService{
		merchantRepo:            merchantRepo,
		cryptoService:           cryptoService,
		slipVerificationService: slipVerificationService,
		baseURL:                 baseURL,
		lineUserIDs:             make(map[uuid.UUID]string),
		processedLineMessages:   make(map[string]time.Time),
	}

	// Register verification callback if slip service is available
	if slipVerificationService != nil {
		slipVerificationService.SetVerificationCallback(service.handleVerificationCompletion)
	}

	return service
}

// GetLINEWebhookConfig retrieves LINE webhook configuration for a merchant
func (s *LINEWebhookService) GetLINEWebhookConfig(merchantID uuid.UUID) (*models.LINEWebhookConfig, error) {
	config, err := s.merchantRepo.GetLINEWebhookConfig(merchantID)
	if err != nil {
		return nil, err
	}

	// Construct webhook URL if configured
	if config.IsConfigured && config.WebhookReferenceID != nil {
		webhookURL := fmt.Sprintf("%s/v1/line/webhook/%s", s.baseURL, *config.WebhookReferenceID)
		config.WebhookURL = &webhookURL
	}

	return config, nil
}

// UpdateLINEWebhookConfig updates LINE webhook configuration for a merchant
func (s *LINEWebhookService) UpdateLINEWebhookConfig(merchantID uuid.UUID, request *models.UpdateLINEWebhookRequest) error {
	// Validate input
	if request.LINEChannelID == "" || request.LINEChannelSecret == "" || request.LINEAccessToken == "" {
		return errors.New("all LINE credentials are required")
	}

	// Encrypt sensitive credentials
	encryptedSecret, err := s.cryptoService.Encrypt(request.LINEChannelSecret)
	if err != nil {
		return fmt.Errorf("failed to encrypt channel secret: %w", err)
	}

	encryptedToken, err := s.cryptoService.Encrypt(request.LINEAccessToken)
	if err != nil {
		return fmt.Errorf("failed to encrypt access token: %w", err)
	}

	// Get existing config to check if webhook_reference_id exists
	existingConfig, _ := s.merchantRepo.GetLINEWebhookConfig(merchantID)
	webhookRefID := ""

	if existingConfig != nil && existingConfig.WebhookReferenceID != nil {
		webhookRefID = *existingConfig.WebhookReferenceID
	} else {
		// Generate new webhook reference ID
		webhookRefID, err = s.generateWebhookReferenceID()
		if err != nil {
			return fmt.Errorf("failed to generate webhook reference ID: %w", err)
		}
	}

	// Update in database (webhookRefID stays plain text - used in URLs and lookups)
	err = s.merchantRepo.UpdateLINEWebhookConfig(merchantID, request.LINEChannelID, encryptedSecret, encryptedToken, webhookRefID)
	if err != nil {
		return err
	}

	log.Printf("LINE webhook configuration updated for merchant %s", merchantID)
	return nil
}

// DeleteLINEWebhookConfig removes LINE webhook configuration
func (s *LINEWebhookService) DeleteLINEWebhookConfig(merchantID uuid.UUID) error {
	return s.merchantRepo.DeleteLINEWebhookConfig(merchantID)
}

// TestLINEWebhook tests LINE webhook connectivity
func (s *LINEWebhookService) TestLINEWebhook(merchantID uuid.UUID) (*models.LINEWebhookTestResponse, error) {
	config, err := s.merchantRepo.GetLINEWebhookConfig(merchantID)
	if err != nil {
		return nil, err
	}

	if !config.IsConfigured {
		return &models.LINEWebhookTestResponse{
			WebhookStatus:       "not_configured",
			ConnectionStatus:    "disconnected",
			SignatureValidation: "skipped",
			APIAccess:           "unavailable",
			TestedAt:            time.Now(),
			ResponseTimeMs:      0,
		}, nil
	}

	startTime := time.Now()
	_, accessToken, err := s.decryptMerchantCredentials(&models.MerchantProfile{ID: merchantID})
	if err != nil {
		return &models.LINEWebhookTestResponse{
			WebhookStatus:       "active",
			ConnectionStatus:    "disconnected",
			SignatureValidation: "skipped",
			APIAccess:           "credentials_error",
			TestedAt:            time.Now(),
			ResponseTimeMs:      time.Since(startTime).Milliseconds(),
		}, nil
	}

	testResult := s.testLINEAPIAccess(accessToken)
	responseTime := time.Since(startTime).Milliseconds()
	connectionStatus := "connected"
	if testResult != "working" {
		connectionStatus = "disconnected"
	}

	return &models.LINEWebhookTestResponse{
		WebhookStatus:       "active",
		ConnectionStatus:    connectionStatus,
		SignatureValidation: "passed",
		APIAccess:           testResult,
		TestedAt:            time.Now(),
		ResponseTimeMs:      responseTime,
	}, nil
}

// ProcessWebhook processes incoming LINE webhook for a specific merchant
func (s *LINEWebhookService) ProcessWebhook(webhookRefID string, signature string, body []byte) error {
	// Find merchant by webhook reference ID
	merchant, err := s.findByWebhookReferenceID(webhookRefID)
	if err != nil {
		log.Printf("Webhook reference ID %s not found: %v", webhookRefID, err)
		// Return 200 to prevent LINE from flagging webhook as invalid
		return nil
	}

	// Decrypt merchant's LINE credentials
	channelSecret, accessToken, err := s.decryptMerchantCredentials(merchant)
	if err != nil {
		return fmt.Errorf("failed to decrypt credentials: %w", err)
	}

	// Clear sensitive data from memory ASAP
	defer func() {
		// In Go, we can't manually clear memory, but we can nil references
		channelSecret = ""
		accessToken = ""
	}()

	// Verify webhook signature
	if err := s.verifySignature(channelSecret, body, signature); err != nil {
		log.Printf("Signature verification failed for merchant %s: %v", merchant.ID, err)
		return fmt.Errorf("invalid signature: %w", err)
	}

	// Parse webhook events
	var webhookEvent LINEWebhookEvent
	if err := json.Unmarshal(body, &webhookEvent); err != nil {
		return fmt.Errorf("failed to parse webhook: %w", err)
	}

	if webhookEvent.Destination != "" {
		botInfo, err := s.getLINEBotInfo(accessToken)
		if err != nil {
			log.Printf("LINE access token validation failed for merchant %s: %v", merchant.ID, err)
			return nil
		}
		if botInfo.UserID != "" && botInfo.UserID != webhookEvent.Destination {
			log.Printf(
				"LINE access token does not match webhook destination for merchant %s: webhook_destination=%s token_bot_user_id=%s basic_id=%s",
				merchant.ID,
				webhookEvent.Destination,
				botInfo.UserID,
				botInfo.BasicID,
			)
			return nil
		}
	}

	// Process each event
	for _, event := range webhookEvent.Events {
		if err := s.processEvent(merchant, event, accessToken); err != nil {
			log.Printf("Failed to process event for merchant %s: %v", merchant.ID, err)
			// Continue processing other events
		}
	}

	return nil
}

// Helper methods

func (s *LINEWebhookService) generateWebhookReferenceID() (string, error) {
	// Generate short 4-character alphanumeric string (easy to copy)
	const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	b := make([]byte, 4)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		b[i] = charset[n.Int64()]
	}
	return string(b), nil
}

func (s *LINEWebhookService) findByWebhookReferenceID(webhookRefID string) (*models.MerchantProfile, error) {
	// Since webhook_reference_id is encrypted, we need to decrypt each merchant's ID
	// For efficiency, query all merchants with LINE config and decrypt in memory
	// In production, consider adding a hash column for faster lookups

	// For now, use the repository method that handles decryption
	return s.merchantRepo.FindByWebhookReferenceID(webhookRefID)
}

func (s *LINEWebhookService) decryptMerchantCredentials(merchant *models.MerchantProfile) (string, string, error) {
	// Retrieve encrypted credentials from database
	channelID, encryptedSecret, encryptedToken, webhookRefID, err := s.merchantRepo.GetLINECredentials(merchant.ID)
	if err != nil {
		return "", "", fmt.Errorf("failed to retrieve LINE credentials: %w", err)
	}

	// Check if credentials are configured
	if channelID == "" || encryptedSecret == "" || encryptedToken == "" {
		return "", "", errors.New("LINE credentials not configured for this merchant")
	}

	// Decrypt credentials
	channelSecret, err := s.cryptoService.Decrypt(encryptedSecret)
	if err != nil {
		return "", "", fmt.Errorf("failed to decrypt channel secret: %w", err)
	}

	accessToken, err := s.cryptoService.Decrypt(encryptedToken)
	if err != nil {
		return "", "", fmt.Errorf("failed to decrypt access token: %w", err)
	}

	// Log webhook reference ID for debugging (can be removed in production)
	if webhookRefID != "" {
		log.Printf("Using LINE credentials for webhook reference ID: %s", webhookRefID)
	}

	return channelSecret, accessToken, nil
}

func (s *LINEWebhookService) verifySignature(channelSecret string, body []byte, signature string) error {
	// Decode signature from base64
	sig, err := base64.StdEncoding.DecodeString(signature)
	if err != nil {
		return err
	}

	// Create HMAC hash
	hash := hmac.New(sha256.New, []byte(channelSecret))
	hash.Write(body)

	// Compare signatures
	if !hmac.Equal(hash.Sum(nil), sig) {
		return errors.New("signature mismatch")
	}

	return nil
}

func (s *LINEWebhookService) processEvent(merchant *models.MerchantProfile, event LINEEvent, accessToken string) error {
	switch event.Type {
	case "message":
		return s.processMessageEvent(merchant, event, accessToken)
	case "follow":
		return s.processFollowEvent(merchant, event, accessToken)
	case "unfollow":
		return s.processUnfollowEvent(merchant)
	default:
		log.Printf("Unhandled event type: %s", event.Type)
	}

	return nil
}

func (s *LINEWebhookService) processMessageEvent(merchant *models.MerchantProfile, event LINEEvent, accessToken string) error {
	if event.Message == nil {
		log.Printf("LINE message event missing message payload for merchant %s", merchant.ID)
		return nil
	}

	if event.Message.Type == "image" {
		return s.processLineImageMessage(merchant, event, accessToken)
	} else if event.Message.Type == "text" {
		return s.processTextMessage(merchant, event)
	}

	return nil
}

func (s *LINEWebhookService) processLineImageMessage(merchant *models.MerchantProfile, event LINEEvent, accessToken string) error {
	if event.Message.ID == "" {
		return errors.New("image message ID is missing")
	}

	isRedelivery := event.DeliveryContext != nil && event.DeliveryContext.IsRedelivery
	log.Printf(
		"Processing LINE image message for merchant %s: message_id=%s source_type=%s user_id=%s redelivery=%t",
		merchant.ID,
		event.Message.ID,
		event.Source.Type,
		event.Source.UserID,
		isRedelivery,
	)

	if !s.markLineMessageProcessing(merchant.ID, event.Message.ID) {
		log.Printf("Skipping duplicate LINE image message for merchant %s: message_id=%s", merchant.ID, event.Message.ID)
		return nil
	}

	imageData, contentType, err := s.GetMessageContent(event.Message.ID, accessToken)
	if err != nil {
		log.Printf("Failed to download image from LINE for merchant %s message %s: %v", merchant.ID, event.Message.ID, err)
		if event.Source.UserID != "" {
			errorMsg := "Cannot download the slip image from LINE. Please send the slip again."
			if pushErr := s.PushMessage(event.Source.UserID, []LINEMessage{BuildTextMessage(errorMsg)}, accessToken); pushErr != nil {
				log.Printf("Failed to send LINE download error push: %v", pushErr)
			}
		}
		return nil
	}

	log.Printf("Successfully downloaded image from LINE for merchant %s: %d bytes, content-type: %s", merchant.ID, len(imageData), contentType)

	receiptMsg := "Received your slip. Verifying now..."
	if s.canUseReplyToken(event) {
		if err := s.ReplyMessage(event.ReplyToken, []LINEMessage{BuildTextMessage(receiptMsg)}, accessToken); err != nil {
			log.Printf("Failed to send receipt reply, falling back to push: %v", err)
			if event.Source.UserID != "" {
				if pushErr := s.PushMessage(event.Source.UserID, []LINEMessage{BuildTextMessage(receiptMsg)}, accessToken); pushErr != nil {
					log.Printf("Failed to send receipt push fallback: %v", pushErr)
				}
			}
		}
	} else if event.Source.UserID != "" {
		if err := s.PushMessage(event.Source.UserID, []LINEMessage{BuildTextMessage(receiptMsg)}, accessToken); err != nil {
			log.Printf("Failed to send receipt push for redelivered/dummy reply token: %v", err)
		}
	}

	go s.verifyDownloadedLineImage(merchant, event.Source.UserID, imageData, contentType, accessToken)
	return nil
}

func (s *LINEWebhookService) verifyDownloadedLineImage(merchant *models.MerchantProfile, lineUserID string, imageData []byte, contentType string, accessToken string) {
	if s.slipVerificationService == nil {
		log.Printf("Slip verification service not available for merchant %s", merchant.ID)
		return
	}

	ctx := context.Background()
	slip, err := s.slipVerificationService.UploadAndVerify(ctx, merchant.ID, imageData, contentType)
	if err != nil {
		log.Printf("Slip verification failed for merchant %s: %v", merchant.ID, err)

		errorMsg := "Cannot verify this slip."
		if err.Error() == "merchant must have an active subscription to verify slips" {
			errorMsg = "This merchant does not have an active SlipSure subscription. Please contact the shop."
		} else {
			errorMsg = fmt.Sprintf("Cannot verify this slip: %s", err.Error())
		}

		if lineUserID != "" {
			if pushErr := s.PushMessage(lineUserID, []LINEMessage{BuildTextMessage(errorMsg)}, accessToken); pushErr != nil {
				log.Printf("Failed to send error push: %v", pushErr)
			}
		}
		return
	}

	if lineUserID != "" {
		s.lineUserIDsMutex.Lock()
		s.lineUserIDs[slip.ID] = lineUserID
		s.lineUserIDsMutex.Unlock()
	}

	log.Printf("Slip verification started for merchant %s, slip ID: %s, status: %s, LINE user: %s",
		merchant.ID, slip.ID, slip.Status, lineUserID)
}

func (s *LINEWebhookService) canUseReplyToken(event LINEEvent) bool {
	if event.DeliveryContext != nil && event.DeliveryContext.IsRedelivery {
		return false
	}

	token := strings.TrimSpace(event.ReplyToken)
	if token == "" || strings.Trim(token, "0") == "" {
		return false
	}

	return true
}

func (s *LINEWebhookService) markLineMessageProcessing(merchantID uuid.UUID, messageID string) bool {
	const ttl = 30 * time.Minute
	now := time.Now()
	key := merchantID.String() + ":" + messageID

	s.processedMessagesMutex.Lock()
	defer s.processedMessagesMutex.Unlock()

	if expiresAt, exists := s.processedLineMessages[key]; exists && expiresAt.After(now) {
		return false
	}

	for existingKey, expiresAt := range s.processedLineMessages {
		if expiresAt.Before(now) {
			delete(s.processedLineMessages, existingKey)
		}
	}

	s.processedLineMessages[key] = now.Add(ttl)
	return true
}

func (s *LINEWebhookService) processImageMessage(merchant *models.MerchantProfile, event LINEEvent, accessToken string) error {
	// Send immediate reply to acknowledge receipt
	receiptMsg := "⏳ ได้รับสลิปแล้ว กำลังตรวจสอบ..."
	go func() {
		if err := s.ReplyMessage(event.ReplyToken, []LINEMessage{BuildTextMessage(receiptMsg)}, accessToken); err != nil {
			log.Printf("Failed to send receipt reply: %v", err)
		}
	}()

	// Process image asynchronously to avoid LINE webhook timeout
	go func() {
		// Download image from LINE
		imageData, contentType, err := s.GetMessageContent(event.Message.ID, accessToken)
		if err != nil {
			log.Printf("Failed to download image from LINE: %v", err)
			return
		}

		log.Printf("Successfully downloaded image from LINE for merchant %s: %d bytes, content-type: %s", merchant.ID, len(imageData), contentType)

		// Check if slip verification service is available
		if s.slipVerificationService == nil {
			log.Printf("Slip verification service not available for merchant %s", merchant.ID)
			return
		}

		// Call slip verification service (PROTECTED BY SUBSCRIPTION CHECK)
		ctx := context.Background()
		slip, err := s.slipVerificationService.UploadAndVerify(ctx, merchant.ID, imageData, contentType)
		if err != nil {
			log.Printf("Slip verification failed for merchant %s: %v", merchant.ID, err)

			// Send error message to LINE user via push (reply token may be expired)
			errorMsg := "❌ ไม่สามารถตรวจสอบสลิปได้\n\n"
			if err.Error() == "merchant must have an active subscription to verify slips" {
				errorMsg += "เหตุผล: ร้านค้ายังไม่ได้สมัครแพ็กเกจที่ใช้งานได้\n\nกรุณาติดต่อร้านค้า"
			} else {
				errorMsg += fmt.Sprintf("เกิดข้อผิดพลาด: %s", err.Error())
			}

			// Use push message instead of reply (more reliable for async processing)
			if pushErr := s.PushMessage(event.Source.UserID, []LINEMessage{BuildTextMessage(errorMsg)}, accessToken); pushErr != nil {
				log.Printf("Failed to send error push: %v", pushErr)
			}
			return
		}

		// Store LINE user ID IMMEDIATELY with mutex protection (before async verification can complete)
		s.lineUserIDsMutex.Lock()
		s.lineUserIDs[slip.ID] = event.Source.UserID
		s.lineUserIDsMutex.Unlock()

		log.Printf("Slip verification started for merchant %s, slip ID: %s, status: %s, LINE user: %s",
			merchant.ID, slip.ID, slip.Status, event.Source.UserID)
	}()

	return nil
}

func (s *LINEWebhookService) processTextMessage(merchant *models.MerchantProfile, event LINEEvent) error {
	log.Printf("Received text message from LINE for merchant %s", merchant.ID)
	return nil
}

func (s *LINEWebhookService) processFollowEvent(merchant *models.MerchantProfile, event LINEEvent, accessToken string) error {
	welcomeMessage := fmt.Sprintf("Welcome to %s! Send us a payment slip for verification.", merchant.ShopName)
	return s.ReplyMessage(event.ReplyToken, []LINEMessage{BuildTextMessage(welcomeMessage)}, accessToken)
}

func (s *LINEWebhookService) processUnfollowEvent(merchant *models.MerchantProfile) error {
	log.Printf("User unfollowed merchant %s LINE OA", merchant.ID)
	return nil
}

func (s *LINEWebhookService) testLINEAPIAccess(accessToken string) string {
	if _, err := s.getLINEBotInfo(accessToken); err != nil {
		log.Printf("LINE API access test failed: %v", err)
		if strings.Contains(err.Error(), "status 401") || strings.Contains(err.Error(), "status 403") {
			return "invalid_access_token"
		}
		return "line_api_error"
	}

	return "working"
}

func (s *LINEWebhookService) getLINEBotInfo(accessToken string) (*LINEBotInfo, error) {
	req, err := http.NewRequest("GET", "https://api.line.me/v2/bot/info", nil)
	if err != nil {
		return nil, fmt.Errorf("create bot info request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call bot info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("bot info status %d: %s", resp.StatusCode, string(body))
	}

	var botInfo LINEBotInfo
	if err := json.NewDecoder(resp.Body).Decode(&botInfo); err != nil {
		return nil, fmt.Errorf("decode bot info: %w", err)
	}

	return &botInfo, nil
}

// ReplyMessage sends a reply message to a user using merchant's LINE credentials
func (s *LINEWebhookService) ReplyMessage(replyToken string, messages []LINEMessage, accessToken string) error {
	url := "https://api.line.me/v2/bot/message/reply"

	request := LINEReplyRequest{
		ReplyToken: replyToken,
		Messages:   messages,
	}

	return s.sendLINERequest("POST", url, request, accessToken)
}

// PushMessage sends a push message to a user using merchant's LINE credentials
func (s *LINEWebhookService) PushMessage(userID string, messages []LINEMessage, accessToken string) error {
	url := "https://api.line.me/v2/bot/message/push"

	request := LINEPushRequest{
		To:       userID,
		Messages: messages,
	}

	return s.sendLINERequest("POST", url, request, accessToken)
}

// GetMessageContent downloads message content (image, video, etc.) using merchant's LINE credentials
func (s *LINEWebhookService) GetMessageContent(messageID string, accessToken string) ([]byte, string, error) {
	url := fmt.Sprintf("https://api-data.line.me/v2/bot/message/%s/content", messageID)
	log.Printf("LINE API: Downloading content from %s", url)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get content: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("LINE API: Failed to download content. Status: %d, Body: %s", resp.StatusCode, string(body))
		return nil, "", fmt.Errorf("LINE API returned status %d: %s", resp.StatusCode, string(body))
	}

	// Get content type
	contentType := resp.Header.Get("Content-Type")

	// Read content
	content, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read content: %w", err)
	}

	return content, contentType, nil
}

// sendLINERequest sends a request to LINE API using merchant's access token
func (s *LINEWebhookService) sendLINERequest(method, url string, body interface{}, accessToken string) error {
	jsonData, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest(method, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	log.Printf("LINE API: Sending %s request to %s", method, url)

	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("LINE API: Request failed: %v", err)
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("LINE API: Request failed with status %d: %s", resp.StatusCode, string(respBody))
		return fmt.Errorf("LINE API returned status %d: %s", resp.StatusCode, string(respBody))
	}

	log.Printf("LINE API: Request successful - status %d", resp.StatusCode)
	return nil
}

// sendErrorReply sends an error message via LINE reply
func (s *LINEWebhookService) sendErrorReply(replyToken, message, accessToken string) error {
	errorMessage := fmt.Sprintf("❌ %s", message)
	return s.ReplyMessage(replyToken, []LINEMessage{BuildTextMessage(errorMessage)}, accessToken)
}

// sendSlipResultNotification sends slip verification result notification
func (s *LINEWebhookService) sendSlipResultNotification(merchant *models.MerchantProfile, slip *models.Slip, lineUserID, accessToken string) error {
	var message string

	if slip.Status == models.SlipStatusVerified && slip.Transaction != nil {
		// Success message
		message = fmt.Sprintf("✅ การตรวจสอบสลิปสำเร็จ!\n\n")
		message += fmt.Sprintf("ยอด: %.2f บาท\n", slip.Transaction.Amount)
		message += fmt.Sprintf("เวลา: %s\n", slip.Transaction.TransactionTime.Format("15:04 2006-01-02"))
		message += fmt.Sprintf("\nขอบคุณที่ใช้บริการ %s", merchant.ShopName)
	} else if slip.Status == models.SlipStatusFailed {
		// Failure message
		message = fmt.Sprintf("❌ การตรวจสอบสลิปไม่สำเร็จ\n\n")
		if slip.FailReason != nil {
			switch *slip.FailReason {
			case models.FailReasonDuplicateSlip:
				message += "เหตุผล: สลิปซ้ำ (เคยตรวจสอบแล้ว)"
			case models.FailReasonInvalidQR:
				message += "เหตุผล: ไม่สามารถอ่าน QR Code ได้"
			case models.FailReasonExpiredSlip:
				message += "เหตุผล: สลิปหมดอายุ"
			case models.FailReasonBankError:
				message += "เหตุผล: ไม่สามารถติดต่อธนาคารได้"
			default:
				message += "เหตุผล: กรุณาติดต่อผู้ดูแลระบบ"
			}
		}
		message += fmt.Sprintf("\n\nกรุณาติดต่อ %s หากต้องการความช่วยเหลือ", merchant.ShopName)
	} else {
		// Still processing
		message = fmt.Sprintf("⏳ กำลังตรวจสอบสลิป...\n\n")
		message += "ระบบจะแจ้งผลภายในเร็วๆ นี้"
	}

	log.Printf("Sending LINE push message to user %s: %s", lineUserID, message)

	// Send push message (since reply token might be expired)
	return s.PushMessage(lineUserID, []LINEMessage{BuildTextMessage(message)}, accessToken)
}

// handleVerificationCompletion handles verification completion callback
func (s *LINEWebhookService) handleVerificationCompletion(slip *models.Slip, merchantID uuid.UUID) {
	log.Printf("Verification completed for slip %s: status=%s", slip.ID, slip.Status)

	lineUserID, exists := s.waitForLineUserID(slip.ID, 10, 200*time.Millisecond)
	if !exists {
		log.Printf("No LINE user ID found for slip %s, cannot send notification", slip.ID)
		return
	}

	// Clean up the tracking map
	s.lineUserIDsMutex.Lock()
	delete(s.lineUserIDs, slip.ID)
	s.lineUserIDsMutex.Unlock()

	// Get merchant details
	merchant, err := s.merchantRepo.FindByID(merchantID)
	if err != nil {
		log.Printf("Failed to find merchant %s for verification notification: %v", merchantID, err)
		return
	}

	// Get merchant's LINE credentials
	_, accessToken, err := s.decryptMerchantCredentials(merchant)
	if err != nil {
		log.Printf("Failed to decrypt LINE credentials for merchant %s: %v", merchantID, err)
		return
	}

	// Clear sensitive data from memory ASAP
	defer func() {
		accessToken = ""
	}()

	// Send verification result notification
	log.Printf("Sending verification result notification to LINE user %s for slip %s", lineUserID, slip.ID)
	if err := s.sendSlipResultNotification(merchant, slip, lineUserID, accessToken); err != nil {
		log.Printf("Failed to send verification notification: %v", err)
	}
}

func (s *LINEWebhookService) waitForLineUserID(slipID uuid.UUID, attempts int, delay time.Duration) (string, bool) {
	for i := 0; i < attempts; i++ {
		s.lineUserIDsMutex.RLock()
		lineUserID, exists := s.lineUserIDs[slipID]
		s.lineUserIDsMutex.RUnlock()

		if exists {
			return lineUserID, true
		}

		if i < attempts-1 {
			time.Sleep(delay)
		}
	}

	return "", false
}
