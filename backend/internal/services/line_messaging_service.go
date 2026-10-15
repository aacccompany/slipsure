package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"
)

// LINE Messaging Service handles LINE Bot API interactions
type LINEMessagingService struct {
	channelID       string
	channelSecret   string
	accessToken     string
	apiEndpoint     string // For sending messages: https://api.line.me/v2/bot
	dataAPIEndpoint string // For downloading content: https://api-data.line.me/v2/bot
}

// NewLINEMessagingService creates a new LINE messaging service
func NewLINEMessagingService() (*LINEMessagingService, error) {
	channelID := os.Getenv("LINE_MESSAGING_CHANNEL_ID")
	channelSecret := os.Getenv("LINE_MESSAGING_CHANNEL_SECRET")
	accessToken := os.Getenv("LINE_MESSAGING_ACCESS_TOKEN")

	if channelID == "" || channelSecret == "" || accessToken == "" {
		return nil, fmt.Errorf("missing LINE Messaging API credentials")
	}

	return &LINEMessagingService{
		channelID:       channelID,
		channelSecret:   channelSecret,
		accessToken:     accessToken,
		apiEndpoint:     "https://api.line.me/v2/bot",      // For messaging
		dataAPIEndpoint: "https://api-data.line.me/v2/bot", // For content download
	}, nil
}

// ReplyMessage sends a reply message to a user
func (s *LINEMessagingService) ReplyMessage(replyToken string, messages []LINEMessage) error {
	url := fmt.Sprintf("%s/message/reply", s.apiEndpoint)

	request := LINEReplyRequest{
		ReplyToken: replyToken,
		Messages:   messages,
	}

	return s.sendLINERequest("POST", url, request)
}

// PushMessage sends a push message to a user
func (s *LINEMessagingService) PushMessage(userID string, messages []LINEMessage) error {
	url := fmt.Sprintf("%s/message/push", s.apiEndpoint)

	request := LINEPushRequest{
		To:       userID,
		Messages: messages,
	}

	return s.sendLINERequest("POST", url, request)
}

// PushMessageWithRetryKey sends an idempotent push for a persisted alert.
func (s *LINEMessagingService) PushMessageWithRetryKey(userID string, messages []LINEMessage, retryKey string) error {
	url := fmt.Sprintf("%s/message/push", s.apiEndpoint)
	return s.sendLINERequest("POST", url, LINEPushRequest{To: userID, Messages: messages}, retryKey)
}

// CheckRecipient tests whether this channel can access a LINE user's profile.
func (s *LINEMessagingService) CheckRecipient(userID string) (int, error) {
	req, err := http.NewRequest(http.MethodGet, s.apiEndpoint+"/profile/"+url.PathEscape(userID), nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("Authorization", "Bearer "+s.accessToken)
	resp, err := (&http.Client{Timeout: 10 * time.Second}).Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	return resp.StatusCode, nil
}

// ValidatePushMessage checks the alert body without sending it.
func (s *LINEMessagingService) ValidatePushMessage(messages []LINEMessage) error {
	return s.sendLINERequest(http.MethodPost, s.apiEndpoint+"/message/validate/push", struct {
		Messages []LINEMessage `json:"messages"`
	}{Messages: messages})
}

func (s *LINEMessagingService) GetBotInfo() (*LINEBotInfo, error) {
	req, err := http.NewRequest(http.MethodGet, s.apiEndpoint+"/info", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.accessToken)
	resp, err := (&http.Client{Timeout: 10 * time.Second}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("LINE bot info returned status %d", resp.StatusCode)
	}
	var info LINEBotInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	return &info, nil
}

// LINEAPIError identifies a rejected Messaging API request.
type LINEAPIError struct {
	StatusCode int
	Body       string
	RequestID  string
}

func (e *LINEAPIError) Error() string {
	return fmt.Sprintf("LINE API returned status %d (request %s): %s", e.StatusCode, e.RequestID, e.Body)
}

func (s *LINEMessagingService) GetMessageContent(messageID string) ([]byte, string, error) {
	// Use the correct LINE Data API endpoint for downloading content
	// Must use: https://api-data.line.me/v2/bot (NOT api.line.me or dl.line.biz)
	url := fmt.Sprintf("%s/message/%s/content", s.dataAPIEndpoint, messageID)
	log.Printf("LINE API: Downloading content from %s", url)

	return s.downloadFromURL(url)
}

// downloadFromURL downloads content from a URL with LINE authentication
func (s *LINEMessagingService) downloadFromURL(url string) ([]byte, string, error) {
	log.Printf("LINE API: Downloading from URL: %s", url)
	log.Printf("LINE API: Using access token (first 10 chars): %s...", s.accessToken[:10])

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.accessToken)

	client := &http.Client{}
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

// sendLINERequest sends a request to LINE API
func (s *LINEMessagingService) sendLINERequest(method, url string, body interface{}, retryKey ...string) error {
	jsonData, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest(method, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.accessToken)
	if len(retryKey) > 0 && retryKey[0] != "" {
		req.Header.Set("X-Line-Retry-Key", retryKey[0])
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusConflict && len(retryKey) > 0 && retryKey[0] != "" && resp.Header.Get("x-line-accepted-request-id") != "" {
		return nil
	}
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return &LINEAPIError{StatusCode: resp.StatusCode, Body: string(respBody), RequestID: resp.Header.Get("x-line-request-id")}
	}

	return nil
}

// BuildTextMessage creates a text message
func BuildTextMessage(text string) LINEMessage {
	return LINEMessage{
		Type: "text",
		Text: text,
	}
}

// BuildImageMessage creates an image message
func BuildImageMessage(originalContentURL, previewImageURL string) LINEMessage {
	return LINEMessage{
		Type:               "image",
		OriginalContentURL: originalContentURL,
		PreviewImageURL:    previewImageURL,
	}
}

// BuildQuickReply creates quick reply buttons
func BuildQuickReply(items []LINEQuickReplyItem) LINEQuickReply {
	return LINEQuickReply{
		Items: items,
	}
}

// LINE Request/Response Types

type LINEReplyRequest struct {
	ReplyToken string        `json:"replyToken"`
	Messages   []LINEMessage `json:"messages"`
}

type LINEPushRequest struct {
	To       string        `json:"to"`
	Messages []LINEMessage `json:"messages"`
}

type LINEMessage struct {
	Type               string          `json:"type"`
	Text               string          `json:"text,omitempty"`
	OriginalContentURL string          `json:"originalContentUrl,omitempty"`
	PreviewImageURL    string          `json:"previewImageUrl,omitempty"`
	QuickReply         *LINEQuickReply `json:"quickReply,omitempty"`
}

type LINEQuickReply struct {
	Items []LINEQuickReplyItem `json:"items"`
}

type LINEQuickReplyItem struct {
	Type   string             `json:"type"`
	Label  string             `json:"label,omitempty"`
	Text   string             `json:"text"`
	Data   string             `json:"data"`
	Action *LINEMessageAction `json:"action,omitempty"`
}

type LINEMessageAction struct {
	Type  string `json:"type"`
	Label string `json:"label,omitempty"`
	URI   string `json:"uri,omitempty"`
	Text  string `json:"text,omitempty"`
	Data  string `json:"data,omitempty"`
}

// LINE Webhook Event Types

type LINEWebhookEvent struct {
	Destination string      `json:"destination"`
	Events      []LINEEvent `json:"events"`
}

type LINEEvent struct {
	Type            string               `json:"type"`
	ReplyToken      string               `json:"replyToken"`
	Timestamp       int64                `json:"timestamp"`
	Source          LINEEventSource      `json:"source"`
	Message         *LINEMessageEvent    `json:"message,omitempty"`
	Postback        *LINEPostback        `json:"postback,omitempty"`
	DeliveryContext *LINEDeliveryContext `json:"deliveryContext,omitempty"`
}

type LINEEventSource struct {
	Type   string `json:"type"`
	UserID string `json:"userId"`
}

type LINEMessageEvent struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	CreatedAt int64  `json:"createdAt,omitempty"`
}

type LINEDeliveryContext struct {
	IsRedelivery bool `json:"isRedelivery"`
}

type LINEPostback struct {
	Data string `json:"data"`
}

type LINEBotInfo struct {
	UserID      string `json:"userId"`
	BasicID     string `json:"basicId"`
	DisplayName string `json:"displayName"`
}
