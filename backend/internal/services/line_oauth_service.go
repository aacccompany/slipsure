package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// LineOAuthService handles LINE OAuth authentication
type LineOAuthService struct {
	client        *http.Client
	channelID     string
	channelSecret string
}

// LINE OAuth API response structures
type LineTokenResponse struct {
	AccessToken  string `json:"access_token"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
	TokenType    string `json:"token_type"`
	Scope        string `json:"scope"`
}

type LineProfileResponse struct {
	UserID        string `json:"userId"`
	DisplayName   string `json:"displayName"`
	PictureURL    string `json:"pictureUrl"`
	StatusMessage string `json:"statusMessage"`
}

type LineErrorResponse struct {
	Error            string `json:"error"`
	ErrorDescription string `json:"error_description"`
}

// NewLineOAuthService creates a new LINE OAuth service instance
func NewLineOAuthService() (*LineOAuthService, error) {
	channelID := os.Getenv("LINE_LOGIN_CHANNEL_ID")
	channelSecret := os.Getenv("LINE_LOGIN_CHANNEL_SECRET")

	log.Printf(" LINE OAuth - Channel ID found: %t", channelID != "")
	log.Printf(" LINE OAuth - Channel Secret found: %t", channelSecret != "")

	if channelID == "" || channelSecret == "" {
		return nil, errors.New("LINE_LOGIN_CHANNEL_ID and LINE_LOGIN_CHANNEL_SECRET environment variables must be set")
	}

	return &LineOAuthService{
		client:        &http.Client{Timeout: 30 * time.Second},
		channelID:     channelID,
		channelSecret: channelSecret,
	}, nil
}

// ExchangeCodeForToken exchanges authorization code for access token
func (s *LineOAuthService) ExchangeCodeForToken(code, redirectURI string) (*LineTokenResponse, error) {
	// LINE OAuth token endpoint
	tokenURL := "https://api.line.me/oauth2/v2.1/token"

	// Build request body
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)
	data.Set("client_id", s.channelID)
	data.Set("client_secret", s.channelSecret)

	// Create request with form-encoded body
	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Send request
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for token: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		var errResp LineErrorResponse
		if err := json.Unmarshal(body, &errResp); err == nil {
			return nil, fmt.Errorf("LINE OAuth error: %s - %s", errResp.Error, errResp.ErrorDescription)
		}
		return nil, fmt.Errorf("LINE OAuth failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var tokenResp LineTokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %w", err)
	}

	return &tokenResp, nil
}

// GetUserProfile retrieves user profile from LINE using access token
func (s *LineOAuthService) GetUserProfile(accessToken string) (*LineProfileResponse, error) {
	// LINE profile API endpoint
	profileURL := "https://api.line.me/v2/profile"

	// Create request
	req, err := http.NewRequest("GET", profileURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	// Send request
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get user profile: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("LINE API failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var profileResp LineProfileResponse
	if err := json.Unmarshal(body, &profileResp); err != nil {
		return nil, fmt.Errorf("failed to parse profile response: %w", err)
	}

	return &profileResp, nil
}

// VerifyAccessToken verifies if an access token is valid
func (s *LineOAuthService) VerifyAccessToken(accessToken string) (bool, error) {
	// LINE verify endpoint
	verifyURL := "https://api.line.me/oauth2/v2.1/verify"

	// Create request
	req, err := http.NewRequest("GET", verifyURL, nil)
	if err != nil {
		return false, fmt.Errorf("failed to create request: %w", err)
	}

	q := req.URL.Query()
	q.Add("access_token", accessToken)
	req.URL.RawQuery = q.Encode()

	// Send request
	resp, err := s.client.Do(req)
	if err != nil {
		return false, fmt.Errorf("failed to verify token: %w", err)
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK, nil
}
