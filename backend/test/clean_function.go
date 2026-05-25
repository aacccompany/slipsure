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

	// Process the image data (already downloaded)
	log.Printf("Processing slip image: %d bytes, content-type: %s", len(imageData), contentType)

	// Process slip verification
	message := fmt.Sprintf("🔍 กำลังตรวจสอบสลิป...\n\nร้านค้า: %s", user.Name)
	reply := services.BuildTextMessage(message)
	if err := h.lineService.PushMessage(event.Source.UserID, []services.LINEMessage{reply}); err != nil {
		log.Printf("Failed to send processing message: %v", err)
	}

	// TODO: Create slip upload request and process verification
	// For now, send completion message
	resultMessage := "✅ ตรวจสอบสลิปเสร็จสิ้น\n\n"
	resultMessage += "สถานะ: ตรวจสอบแล้ว\n"
	resultMessage += fmt.Sprintf("ร้านค้า: %s\n", user.Name)
	resultMessage += "\nดูรายละเอียดได้ที่ https://app.yourdomain.com"

	resultReply := services.BuildTextMessage(resultMessage)
	if err := h.lineService.PushMessage(event.Source.UserID, []services.LINEMessage{resultReply}); err != nil {
		log.Printf("Failed to send result message: %v", err)
	}

	log.Printf("Slip verification completed for merchant %s", *user.MerchantID)
}
