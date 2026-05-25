package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

// LINE Messaging Service handles LINE Bot API interactions
type LINEMessagingService struct {
	channelID       string
	channelSecret   string
	accessToken     string
	apiEndpoint     string  // For sending messages: https://api.line.me/v2/bot
	dataAPIEndpoint string  // For downloading content: https://api-data.line.me/v2/bot
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
		apiEndpoint:     "https://api.line.me/v2/bot",       // For messaging
		dataAPIEndpoint: "https://api-data.line.me/v2/bot",   // For content download
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
func (s *LINEMessagingService) sendLINERequest(method, url string, body interface{}) error {
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

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("LINE API returned status %d: %s", resp.StatusCode, string(respBody))
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
	Type       string            `json:"type"`
	ReplyToken string            `json:"replyToken"`
	Timestamp  int64             `json:"timestamp"`
	Source     LINEEventSource   `json:"source"`
	Message    *LINEMessageEvent `json:"message,omitempty"`
	Postback   *LINEPostback     `json:"postback,omitempty"`
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

type LINEPostback struct {
	Data string `json:"data"`
}
