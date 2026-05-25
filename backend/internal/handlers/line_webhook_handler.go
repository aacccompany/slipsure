package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"slipsure-backend/internal/models"
	"slipsure-backend/internal/repositories"
	"slipsure-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// LINEWebhookHandler handles LINE webhook events
type LINEWebhookHandler struct {
	lineService  *services.LINEMessagingService
	slipService  *services.SlipVerificationService
	merchantRepo repositories.MerchantRepository
	userRepo     repositories.UserRepository
}

// NewLINEWebhookHandler creates a new LINE webhook handler
func NewLINEWebhookHandler(
	lineService *services.LINEMessagingService,
	slipService *services.SlipVerificationService,
	merchantRepo repositories.MerchantRepository,
	userRepo repositories.UserRepository,
) *LINEWebhookHandler {
	return &LINEWebhookHandler{
		lineService:  lineService,
		slipService:  slipService,
		merchantRepo: merchantRepo,
		userRepo:     userRepo,
	}
}

// HandleWebhook handles POST /line/webhook - receive LINE events
func (h *LINEWebhookHandler) HandleWebhook(c *gin.Context) {
	// Log incoming request for debugging
	log.Printf("LINE webhook received from %s", c.ClientIP())

	// Read raw body (only once)
	body, err := c.GetRawData()
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		c.JSON(http.StatusOK, gin.H{"status": "ok"}) // Return 200 to LINE to avoid retries
		return
	}

	log.Printf("LINE webhook body length: %d bytes", len(body))

	// Verify webhook signature (security)
	signature := c.GetHeader("X-Line-Signature")
	if !h.VerifyWebhookSignature(signature, body) {
		log.Printf("Invalid LINE webhook signature")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
		return
	}

	// Parse LINE webhook events from the body we already read
	var webhookEvent services.LINEWebhookEvent
	if err := json.Unmarshal(body, &webhookEvent); err != nil {
		log.Printf("Error parsing LINE webhook JSON: %v", err)
		log.Printf("Raw body: %s", string(body))
		c.JSON(http.StatusOK, gin.H{"status": "ok"}) // Return 200 to avoid retries
		return
	}

	log.Printf("Received %d LINE events", len(webhookEvent.Events))

	// Process each event asynchronously
	for _, event := range webhookEvent.Events {
		go func(e services.LINEEvent) {
			if err := h.processEvent(e); err != nil {
				log.Printf("Error processing LINE event: %v", err)
			}
		}(event)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":           "ok",
		"processed_events": len(webhookEvent.Events),
	})
}

// processEvent processes a single LINE event
func (h *LINEWebhookHandler) processEvent(event services.LINEEvent) error {
	switch event.Type {
	case "message":
		return h.handleMessage(event)
	case "postback":
		return h.handlePostback(event)
	default:
		log.Printf("Unhandled event type: %s", event.Type)
	}

	return nil
}

// handleMessage handles message events from LINE
func (h *LINEWebhookHandler) handleMessage(event services.LINEEvent) error {
	if event.Message == nil {
		return nil
	}

	switch event.Message.Type {
	case "image":
		return h.handleImageMessage(event)
	case "text":
		return h.handleTextMessage(event)
	default:
		log.Printf("Unhandled message type: %s", event.Message.Type)
	}

	return nil
}

// handleImageMessage processes image messages (slip verification)
func (h *LINEWebhookHandler) handleImageMessage(event services.LINEEvent) error {
	log.Printf("Processing image message %s from user %s", event.Message.ID, event.Source.UserID)

	// Debug: Log the entire event structure to see what LINE sends
	eventJSON, _ := json.Marshal(event)
	log.Printf("DEBUG - LINE Event structure: %s", string(eventJSON))

	// Download image IMMEDIATELY (synchronous) before processing
	// LINE message content can expire quickly, so we must download it now
	imageData, contentType, err := h.lineService.GetMessageContent(event.Message.ID)
	if err != nil {
		log.Printf("Failed to download image from LINE: %v", err)

		// Send error message to user
		errorMsg := " ไม่สามารถดาวน์โหลดรูปจาก LINE ได้ กรุณาลองใหม่อีกครับ/ค่ะ"
		reply := services.BuildTextMessage(errorMsg)
		if replyErr := h.lineService.ReplyMessage(event.ReplyToken, []services.LINEMessage{reply}); replyErr != nil {
			log.Printf("Failed to send error reply: %v", replyErr)
		}
		return fmt.Errorf("failed to download image: %w", err)
	}

	log.Printf("Successfully downloaded image from LINE: %d bytes, content-type: %s", len(imageData), contentType)

	// Send immediate response
	message := "🙏 ขอบคุณที่ส่งสลิปมาครับ/ค่ะ\n\n"
	message += "ระบบกำลังตรวจสอบสลิปของคุณ...\n"
	message += "สามารถตรวจสถานะได้ที่ https://app.yourdomain.com"

	reply := services.BuildTextMessage(message)
	if err := h.lineService.ReplyMessage(event.ReplyToken, []services.LINEMessage{reply}); err != nil {
		log.Printf("Failed to send immediate reply: %v", err)
		return fmt.Errorf("failed to send reply: %w", err)
	}

	// Process slip verification asynchronously with the downloaded image
	go h.processSlipVerificationAsync(event, imageData, contentType)

	return nil
}

// processSlipVerificationAsync processes slip verification asynchronously
func (h *LINEWebhookHandler) processSlipVerificationAsync(event services.LINEEvent, imageData []byte, contentType string) {
	log.Printf("Starting async slip verification for image (%d bytes, %s)", len(imageData), contentType)

	// Find user by LINE User ID
	user, err := h.userRepo.FindByLineUserID(event.Source.UserID)
	if err != nil {
		log.Printf("LINE user %s not found in system: %v", event.Source.UserID, err)
		// Send error message - user needs to connect their LINE account first
		message := "ไม่พบบัญชีผู้ใช้\n\n"
		message += "กรุณาเชื่อมต่อบัญชี LINE กับระบบ SlipSure ก่อนส่งสลิปครับ/ค่ะ\n\n"
		message += "วิธีเชื่อมต่อ: https://app.yourdomain.com/settings/line"

		reply := services.BuildTextMessage(message)
		if err := h.lineService.PushMessage(event.Source.UserID, []services.LINEMessage{reply}); err != nil {
			log.Printf("Failed to send error message: %v", err)
		}
		return
	}

	if user.MerchantID == nil {
		log.Printf("User %s has no merchant account associated", user.ID)
		message := "ไม่พบบัญชีร้านค้า\n\n"
		message += "กรุณาสร้างบัญชีร้านค้าก่อนใช้งานระบบตรวจสอบสลิปครับ/ค่ะ"

		reply := services.BuildTextMessage(message)
		if err := h.lineService.PushMessage(event.Source.UserID, []services.LINEMessage{reply}); err != nil {
			log.Printf("Failed to send merchant needed message: %v", err)
		}
		return
	}

	log.Printf("Found LINE user %s, merchant ID: %s", user.ID, *user.MerchantID)

	// Send processing message
	message := fmt.Sprintf("🙏 ขอบคุณที่ส่งสลิปครับ/ค่ะ\n\n")
	message += fmt.Sprintf("ร้านค้า: %s\n", user.Name)
	message += "ระบบกำลังตรวจสอบสลิป...\n"

	reply := services.BuildTextMessage(message)
	if err := h.lineService.PushMessage(event.Source.UserID, []services.LINEMessage{reply}); err != nil {
		log.Printf("Failed to send processing message: %v", err)
	}

	// Call actual slip verification service
	slip, err := h.slipService.UploadAndVerify(context.Background(), *user.MerchantID, imageData, contentType)
	if err != nil {
		log.Printf("Failed to start slip verification: %v", err)

		// Check if it's a QR scanning error (common issue)
		if strings.Contains(err.Error(), "failed to extract QR") || strings.Contains(err.Error(), "failed to decode QR") {
			errorMessage := "📷 ไม่สามารถอ่าน QR Code จากรูปได้\n\n"
			errorMessage += "กรุณาลองอีกครั้ง:\n"
			errorMessage += "• ถ่ายรูปให้ชัดและใกล้ QR Code มากขึ้น\n"
			errorMessage += "• แสงสว่างพอดี\n"
			errorMessage += "• หลีกเลี่ยงแสงสะท้อน\n\n"
			errorMessage += "หรือส่งข้อมูลการโอนเงินมาที่ @LineOfficial ของเรา"

			errorReply := services.BuildTextMessage(errorMessage)
			if err := h.lineService.PushMessage(event.Source.UserID, []services.LINEMessage{errorReply}); err != nil {
				log.Printf("Failed to send error message: %v", err)
			}
			return
		}

		// Generic error
		errorMessage := "เกิดข้อผิดพลาดในการตรวจสอบสลิป\n\n"
		errorMessage += "กรุณาลองใหม่อีกครั้งหรือติดต่อทีมงาน"

		errorReply := services.BuildTextMessage(errorMessage)
		if err := h.lineService.PushMessage(event.Source.UserID, []services.LINEMessage{errorReply}); err != nil {
			log.Printf("Failed to send error message: %v", err)
		}
		return
	}

	log.Printf("Slip verification started successfully: %s", slip.ID)

	// Poll for verification results
	go h.pollVerificationResults(event.Source.UserID, user.Name, slip.ID)
}

// handleTextMessage handles text messages
func (h *LINEWebhookHandler) handleTextMessage(event services.LINEEvent) error {
	log.Printf("Received text message from user %s", event.Source.UserID)

	// Show help menu
	message := "SlipSure Bot - ระบบตรวจสอบสลิป\n\n"
	message += "วิธีใช้งาน:\n"
	message += "1. ส่งรูปสลิปโอนเงิน\n"
	message += "2. ระบบจะตรวจสอบให้\n"
	message += "3. รับผลการตรวจสอบ\n\n"
	message += "คำสั่ง:\n"
	message += "- พิมพ์ 'help' เพื่อดูวิธีใช้งาน\n"
	message += "- พิมพ์ 'status' เพื่อตรวจสถานะ\n"

	reply := services.BuildTextMessage(message)
	return h.lineService.ReplyMessage(event.ReplyToken, []services.LINEMessage{reply})
}

// handlePostback handles postback events (button clicks, etc.)
func (h *LINEWebhookHandler) handlePostback(event services.LINEEvent) error {
	if event.Postback == nil {
		return nil
	}

	log.Printf("Received postback data: %s", event.Postback.Data)

	// Parse postback data
	// Format: action=select_merchant&merchant_id=xxx
	data := event.Postback.Data

	if strings.Contains(data, "action=") {
		parts := strings.Split(data, "&")
		action := strings.TrimPrefix(parts[0], "action=")

		switch action {
		case "select_merchant":
			go h.handleMerchantSelection(event, parts)
			return nil
		default:
			return h.handleUnknownAction(event)
		}
	}

	return nil
}

// handleMerchantSelection handles merchant selection flow
func (h *LINEWebhookHandler) handleMerchantSelection(event services.LINEEvent, parts []string) {
	// Extract merchant_id from postback data
	// Format: action=select_merchant&merchant_id=xxx

	var merchantID string
	for i := 1; i < len(parts); i++ {
		if strings.HasPrefix(parts[i], "merchant_id=") {
			merchantID = strings.TrimPrefix(parts[i], "merchant_id=")
			break
		}
	}

	log.Printf("Merchant selection: merchantID=%s", merchantID)

	if merchantID == "" {
		// Send error message
		message := " เกิดข้อผิดพลาดในการเลือกร้านค้า"
		reply := services.BuildTextMessage(message)
		if err := h.lineService.ReplyMessage(event.ReplyToken, []services.LINEMessage{reply}); err != nil {
			log.Printf("Failed to send error message: %v", err)
		}
		return
	}

	// Confirm merchant selection
	merchantUUID, err := uuid.Parse(merchantID)
	if err != nil {
		log.Printf("Failed to parse merchant UUID: %v", err)
		message := " ร้านค้าไม่ถูกต้อง"
		reply := services.BuildTextMessage(message)
		if err := h.lineService.ReplyMessage(event.ReplyToken, []services.LINEMessage{reply}); err != nil {
			log.Printf("Failed to send error message: %v", err)
		}
		return
	}

	merchant, err := h.merchantRepo.FindByID(merchantUUID)
	if err != nil {
		log.Printf("Failed to find merchant: %v", err)
		message := " ไม่พบร้านค้า"
		reply := services.BuildTextMessage(message)
		if err := h.lineService.ReplyMessage(event.ReplyToken, []services.LINEMessage{reply}); err != nil {
			log.Printf("Failed to send error message: %v", err)
		}
		return
	}

	// TODO: Associate LINE user ID with merchant
	// For now, just confirm selection
	message := fmt.Sprintf("เลือกร้าน %s แล้ว\n\nส่งรูปสลิปมาเพื่อตรวจสอบได้เลยครับ/ค่ะ", merchant.ShopName)
	reply := services.BuildTextMessage(message)
	if err := h.lineService.ReplyMessage(event.ReplyToken, []services.LINEMessage{reply}); err != nil {
		log.Printf("Failed to send confirmation message: %v", err)
	}
}

// handleUnknownAction handles unknown postback actions
func (h *LINEWebhookHandler) handleUnknownAction(event services.LINEEvent) error {
	message := " ไม่เข้าใจคำสั่ง ลองใหม่อีกครั้งครับ/ค่ะ"
	reply := services.BuildTextMessage(message)
	return h.lineService.ReplyMessage(event.ReplyToken, []services.LINEMessage{reply})
}

// GetWebhookURL returns the webhook URL for LINE configuration
func (h *LINEWebhookHandler) GetWebhookURL(baseURL string) string {
	return fmt.Sprintf("%s/v1/line/webhook", baseURL)
}

// VerifyWebhookSignature verifies LINE webhook signature (security)
func (h *LINEWebhookHandler) VerifyWebhookSignature(signature string, body []byte) bool {
	// TODO: Implement proper webhook signature verification
	// For now, return true for development
	return true
}

// pollVerificationResults polls for verification results and sends updates to user
func (h *LINEWebhookHandler) pollVerificationResults(lineUserID, merchantName string, slipID uuid.UUID) {
	log.Printf("Starting to poll verification results for slip %s", slipID)

	// Poll for up to 60 seconds with 5-second intervals
	maxAttempts := 12 // 12 * 5 seconds = 60 seconds
	for attempt := 0; attempt < maxAttempts; attempt++ {
		// Sleep before polling (except first attempt)
		if attempt > 0 {
			time.Sleep(5 * time.Second)
		}

		// Get slip status
		slip, err := h.slipService.GetSlip(slipID)
		if err != nil {
			log.Printf("Error fetching slip status: %v", err)
			continue
		}

		log.Printf("Poll attempt %d: slip status = %s", attempt+1, slip.Status)

		// Check if verification is complete
		if slip.Status == models.SlipStatusVerified || slip.Status == models.SlipStatusFailed {
			h.sendVerificationResult(lineUserID, merchantName, slip)
			return
		}
	}

	// Timeout - send timeout message
	timeoutMessage := "⏱ การตรวจสอบสลิปใช้เวลานานกว่าปกติ\n\n"
	timeoutMessage += "ระบบยังคงตรวจสอบอยู่ คุณสามารถตรวจสอบสถานะได้ที่:\n"
	timeoutMessage += "https://app.yourdomain.com"

	reply := services.BuildTextMessage(timeoutMessage)
	if err := h.lineService.PushMessage(lineUserID, []services.LINEMessage{reply}); err != nil {
		log.Printf("Failed to send timeout message: %v", err)
	}
}

// sendVerificationResult sends the final verification result to the user
func (h *LINEWebhookHandler) sendVerificationResult(lineUserID, merchantName string, slip *models.Slip) {
	log.Printf("Sending verification result for slip %s: status=%s", slip.ID, slip.Status)

	var message string

	if slip.Status == models.SlipStatusVerified && slip.Transaction != nil {
		// Success case
		message = " ตรวจสอบสลิปเสร็จสิ้น\n\n"
		message += fmt.Sprintf("ร้านค้า: %s\n", merchantName)
		message += fmt.Sprintf("ยอดโอน: %.2f บาท\n", slip.Transaction.Amount)
		message += fmt.Sprintf("เวลาทำรายการ: %s\n", formatThaiTime(slip.Transaction.TransferAt))
		message += fmt.Sprintf("จากบัญชี: %s-%s\n", slip.Transaction.SenderBank, slip.Transaction.SenderAccount)
		message += fmt.Sprintf("หมายเลขอ้างอิง: %s\n", slip.Transaction.ReferenceNo)

		if slip.Transaction.IsDuplicate {
			message += "\n⚠ เป็นรายการที่ซ้ำกัน"
		}

		message += "\n✓ ยืนยันรายการสำเร็จ"
	} else {
		// Failure case
		message = " ตรวจสอบสลิปไม่สำเร็จ\n\n"
		message += fmt.Sprintf("ร้านค้า: %s\n", merchantName)

		if slip.FailReason != nil {
			message += fmt.Sprintf("เหตุผล: %s\n", getThaiFailReason(*slip.FailReason))
		}

		message += "\nกรุณาตรวจสอบสลิปและลองใหม่อีกครั้ง"
	}

	message += "\n\nดูรายละเอียดได้ที่ https://app.yourdomain.com"

	reply := services.BuildTextMessage(message)
	if err := h.lineService.PushMessage(lineUserID, []services.LINEMessage{reply}); err != nil {
		log.Printf("Failed to send verification result: %v", err)
	}
}

// formatThaiTime formats time in Thai timezone
func formatThaiTime(t *time.Time) string {
	if t == nil {
		return "ไม่ระบุ"
	}

	// Thai timezone
	thaiLocation, _ := time.LoadLocation("Asia/Bangkok")
	thaiTime := t.In(thaiLocation)

	return thaiTime.Format("02/01/2006 15:04")
}

// getThaiFailReason returns Thai explanation of failure reason
func getThaiFailReason(reason models.FailReason) string {
	switch reason {
	case models.FailReasonDuplicateSlip:
		return "สลิปรูปนี้ถูกใช้ไปแล้ว"
	case models.FailReasonAmountMismatch:
		return "ยอดเงินไม่ตรงกัน"
	case models.FailReasonTimeout:
		return "หมดเวลาตรวจสอบ"
	case models.FailReasonInvalidQR:
		return "ไม่สามารถอ่าน QR Code ได้"
	case models.FailReasonBankError:
		return "เกิดข้อผิดพลาดในการตรวจสอบกับธนาคาร"
	case models.FailReasonExpiredSlip:
		return "สลิปหมดอายุ"
	default:
		return "เกิดข้อผิดพลาดไม่ทราบสาเหตุ"
	}
}
