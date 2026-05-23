# LINE Messaging API Webhook Implementation Guide

## CRITICAL INTEGRATION - This is how your LINE Bot communicates with your backend!

### 🎯 What is the LINE Webhook?

The LINE webhook is **THE CORE** of your customer-facing platform. It's how:
- **Customers** send slip images to your LINE Bot
- **Your API** receives and processes these images
- **Results** are delivered back to customers

---

## 🔧 Webhook Configuration

### Step 1: LINE Developers Console Setup

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Select your Messaging API channel  
3. Navigate to "Messaging API" tab
4. Set webhook URL: `https://api.yourdomain.com/v1/line/webhook`
5. Toggle "Use webhook" to ON
6. Click "Verify" to test the webhook connection

### Step 2: Environment Variables (Already configured!)

```env
LINE_MESSAGING_CHANNEL_ID=2010059227
LINE_MESSAGING_CHANNEL_SECRET=779f5b269729cc7cd7ba9c1c844dec0f  
LINE_MESSAGING_ACCESS_TOKEN=BXI/exLnViN5EJKTC3spc7B/myPXl6KYYILaIYB4lWXqqcnmZ/dLfZq6O70WdtTgFuWTG22Mmi+cmOoKwNK26UoA1ylP6HeJ1Qp+/Uy8eQH4TAkp7JkKZzFXT1of1t+fbZ9aRx+twbz9YDcDFct1JgdB04t89/1O/w1cDnyilFU=
```

---

## 📡 POST `/line/webhook`

### Request Flow

```
LINE Platform → Your Server → Processing → Response to LINE
```

### Security (CRITICAL!)

**Every webhook request MUST be verified:**

```go
func verifyLineSignature(body []byte, signature string) bool {
    channelSecret := os.Getenv("LINE_MESSAGING_CHANNEL_SECRET")
    hash := hmac.New(sha256.New, []byte(channelSecret))
    hash.Write(body)
    computedSignature := base64.StdEncoding.EncodeToString(hash.Sum(nil))
    return hmac.Equal([]byte(signature), []byte(computedSignature))
}

// In your webhook handler:
signature := r.Header.Get("X-Line-Signature")
if !verifyLineSignature(body, signature) {
    http.Error(w, "Invalid signature", 401)
    return
}
```

### Request Format (from LINE)

```json
{
  "destination": "U2010059227",
  "events": [
    {
      "type": "message",
      "replyToken": "nHuyWiB7yP5...",
      "source": {
        "userId": "U1234567890",
        "type": "user"
      },
      "message": {
        "id": "1234567890",
        "type": "image",
        "contentProvider": {
          "type": "line"
        }
      },
      "timestamp": 1634567890123,
      "mode": "active"
    }
  ]
}
```

### Response Format

```json
{
  "status": "ok"
}
```

---

## 🔄 Complete Customer Flow

### Step 1: Customer Sends Slip Image
```
Customer → [Sends slip image] → LINE Platform → Your Webhook
```

**Your webhook handler:**
```go
func handleWebhook(r *http.Request) {
    // 1. Verify signature ✅
    if !verifyLineSignature(body, signature) {
        return 401
    }
    
    // 2. Parse webhook events
    var webhook LineWebhook
    json.Unmarshal(body, &webhook)
    
    // 3. Handle each event
    for _, event := range webhook.Events {
        switch event.Type {
        case "message":
            if event.Message.Type == "image" {
                handleImageMessage(event)
            }
        case "postback":
            handleMerchantSelection(event)
        }
    }
    
    // 4. Return 200 OK
    w.WriteHeader(200)
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
```

### Step 2: Process Image & Extract QR
```go
func handleImageMessage(event LineEvent) {
    // Download image from LINE servers
    imageURL := fmt.Sprintf("https://api.line.me/v2/bot/message/%s/content", event.Message.ID)
    imageBytes := downloadFromLINE(imageURL)
    
    // Extract QR code data
    qrData := extractQRCode(imageBytes)
    
    // Store temporarily (cache or DB)
    storeTempData(event.Source.UserID, qrData)
    
    // Show merchant selection
    showMerchantSelection(event.ReplyToken)
}
```

### Step 3: Show Merchant Selection
```go
func showMerchantSelection(replyToken string) {
    // Get active merchants from database
    merchants := getActiveMerchants()
    
    // Build LINE buttons template
    template := map[string]interface{}{
        "type": "template",
        "altText": "Select merchant",
        "template": map[string]interface{}{
            "type": "buttons",
            "text": "🏪 Select merchant to verify this slip:",
            "actions": []map[string]interface{}{
                {
                    "type": "postback",
                    "label": merchants[0].Name,
                    "data": merchants[0].ID,
                },
                {
                    "type": "postback", 
                    "label": merchants[1].Name,
                    "data": merchants[1].ID,
                },
            },
        },
    }
    
    // Send reply to LINE
    replyToUser(replyToken, template)
}
```

### Step 4: Process Verification (after merchant selection)
```go
func handleMerchantSelection(event LineEvent) {
    // Get stored QR data
    qrData := getTempData(event.Source.UserID)
    merchantID := event.Postback.Data
    
    // Create slip verification
    slip := SlipVerification{
        MerchantID: merchantID,
        QRData: qrData,
        Status: "processing",
    }
    
    // Call your verification API
    result := verifySlipWithBank(slip)
    
    // Send result back to customer
    sendVerificationResult(event.ReplyToken, result)
}
```

---

## 📱 LINE Bot Message Types

### 1. Merchant Selection (Buttons Template)
```json
{
  "type": "template",
  "altText": "Select merchant",
  "template": {
    "type": "buttons",
    "text": "🏪 Select merchant to verify this slip:",
    "actions": [
      {
        "type": "postback",
        "label": "ร้านดอกไม้ขอนแก่น",
        "data": "merchant_uuid_1"
      },
      {
        "type": "postback",
        "label": "ร้านข้าวมือนวด", 
        "data": "merchant_uuid_2"
      },
      {
        "type": "postback",
        "label": "ร้านเสื้อแฟชั่น",
        "data": "merchant_uuid_3"
      }
    ]
  }
}
```

### 2. Processing Message
```json
{
  "type": "text",
  "text": "🔍 Processing your slip with KBank...\n\nThis usually takes 2-3 seconds."
}
```

### 3. Verification Success (Rich Flex Message)
```json
{
  "type": "flex",
  "altText": "Payment Verified ✅",
  "contents": {
    "type": "bubble",
    "styles": {
      "body": {
        "backgroundColor": "#00FF00",
        "color": "#FFFFFF"
      }
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "✅ Payment Verified!",
          "weight": "bold",
          "color": "#FFFFFF",
          "size": "xl"
        },
        {
          "type": "text",
          "text": "Amount: 500.00 THB",
          "color": "#FFFFFF"
        },
        {
          "type": "text", 
          "text": "From: KBANK (xxx-x-xx123-x)",
          "color": "#FFFFFF"
        },
        {
          "type": "text",
          "text": "To: SCB (xxx-x-xx456-x)",
          "color": "#FFFFFF"
        },
        {
          "type": "text",
          "text": "Time: 14:30",
          "color": "#FFFFFF"
        },
        {
          "type": "text",
          "text": "Ref: REF20250522001",
          "color": "#FFFFFF"
        }
      ]
    }
  }
}
```

### 4. Verification Failed
```json
{
  "type": "text",
  "text": "❌ Verification Failed\n\nReason: Duplicate slip detected\n\nThis slip has already been used for another merchant.\n\nPlease contact support if you believe this is an error."
}
```

---

## 🔌 LINE API Integration

### Download Image from LINE
```go
func downloadLineImage(messageID string) ([]byte, error) {
    url := fmt.Sprintf("https://api.line.me/v2/bot/message/%s/content", messageID)
    
    req, _ := http.NewRequest("GET", url, nil)
    req.Header.Set("Authorization", "Bearer "+os.Getenv("LINE_MESSAGING_ACCESS_TOKEN"))
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    return io.ReadAll(resp.Body)
}
```

### Reply to User
```go
func replyToUser(replyToken string, messages interface{}) error {
    url := "https://api.line.me/v2/bot/message/reply"
    
    requestBody := map[string]interface{}{
        "replyToken": replyToken,
        "messages": []interface{}{messages},
    }
    
    jsonData, _ := json.Marshal(requestBody)
    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+os.Getenv("LINE_MESSAGING_ACCESS_TOKEN"))
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != 200 {
        return fmt.Errorf("LINE API returned status: %d", resp.StatusCode)
    }
    
    return nil
}
```

---

## ⚠️ Error Handling & Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **Invalid signature** | Wrong channel secret | Verify `LINE_MESSAGING_CHANNEL_SECRET` |
| **Reply token expired** | >24 hours old | Use Push API instead of Reply API |
| **Image download failed** | Invalid message ID | Handle gracefully, ask user to resend |
| **Rate limiting** | Too many messages | Implement queue/delay system |
| **Webhook unreachable** | Server down | Use LINE's retry mechanism |
| **Timeout** | Processing takes too long | Return 200 immediately, process async |

### Retry Mechanism
- **LINE automatically retries** failed webhook deliveries
- **Retry policy**: Exponential backoff (1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s)
- **Max retries**: Up to 25 times over 24 hours
- **Important**: Always return 200 OK quickly, process asynchronously

---

## 🚀 Best Practices

### 1. Quick Response First
```go
func handleWebhook(r *http.Request) {
    // Parse and validate quickly
    webhook := parseWebhook(r)
    
    // Return 200 OK immediately
    w.WriteHeader(200)
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
    
    // Process asynchronously
    go processWebhookAsync(webhook)
}
```

### 2. Error Logging
```go
func handleWebhookError(event LineEvent, err error) {
    log.Printf("LINE webhook error: UserID=%s, EventType=%s, Error=%v", 
        event.Source.UserID, event.Type, err)
    
    // Send error notification to admins
    sendAdminAlert("LINE Webhook Error", err.Error())
}
```

### 3. User Session Management
```go
// Store user sessions for multi-step flows
type UserSession struct {
    UserID      string
    Step        string  // "waiting_for_merchant", "waiting_for_retry"
    QRData      string
    Timestamp   time.Time
    ReplyToken  string
}
```

---

## 📊 Monitoring & Analytics

### Track Key Metrics
- **Webhook success rate**: % of webhooks processed successfully
- **Response time**: Average time from webhook to customer response
- **Error types**: Most common errors (duplicate, invalid QR, etc.)
- **User engagement**: % of users who complete full verification flow

### Monitoring Endpoints
```go
func getWebhookStats() WebhookStats {
    return WebhookStats{
        TotalReceived:     getStatsCount("webhook.total"),
        SuccessfulProcess: getStatsCount("webhook.success"),
        Errors:           getStatsCount("webhook.error"),
        AverageResponseTime: getStatsAvg("webhook.response_time"),
    }
}
```

---

This webhook implementation is **THE CORE** of your customer experience. Make sure it's robust, secure, and provides great UX! 🚀