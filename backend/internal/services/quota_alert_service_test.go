package services

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"slipsure-backend/internal/models"
)

func TestQuotaAlertThreshold(t *testing.T) {
	tests := []struct {
		name                 string
		total, before, after int
		want                 int
	}{
		{"above threshold", 150, 32, 31, -1},
		{"twenty percent", 150, 31, 30, 20},
		{"no repeat", 150, 30, 29, -1},
		{"five percent", 150, 8, 7, 5},
		{"zero", 150, 1, 0, 0},
		{"large package", 6000, 1201, 1200, 20},
		{"small package zero", 1, 1, 0, 0},
		{"top up", 150, 10, 160, -1},
		{"already low at startup", 351, 351, 20, 20},
		{"already exhausted at startup", 0, 1, 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			before := &models.QuotaStatus{QuotaLimit: tt.total, Remaining: tt.before}
			after := &models.QuotaStatus{QuotaLimit: tt.total, Remaining: tt.after}
			if got := QuotaAlertThreshold(before, after); got != tt.want {
				t.Fatalf("threshold = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestExpiryReminderDays(t *testing.T) {
	now := time.Date(2026, 10, 15, 7, 0, 0, 0, time.UTC)
	tests := []struct {
		remaining time.Duration
		want      int
	}{
		{8 * 24 * time.Hour, 0},
		{7 * 24 * time.Hour, 7},
		{6*24*time.Hour + time.Second, 7},
		{6 * 24 * time.Hour, 0},
		{3 * 24 * time.Hour, 3},
		{2*24*time.Hour + time.Second, 3},
		{2 * 24 * time.Hour, 0},
		{24 * time.Hour, 1},
		{time.Minute, 1},
		{0, 0},
	}
	for _, tt := range tests {
		if got := expiryReminderDays(now.Add(tt.remaining), now); got != tt.want {
			t.Errorf("remaining %s: got %d, want %d", tt.remaining, got, tt.want)
		}
	}
}

func TestThaiQuotaAlertMessages(t *testing.T) {
	expiresAt := time.Date(2026, 11, 14, 8, 30, 0, 0, time.UTC)
	expiry := expiryAlertMessage("ร้านทดสอบ", 50, 3, expiresAt)
	for _, want := range []string{"50 เครดิต", "ภายใน 3 วัน", "14 พ.ย. 2569 เวลา 15:30 น."} {
		if !strings.Contains(expiry, want) {
			t.Errorf("expiry message missing %q: %s", want, expiry)
		}
	}
	balance := balanceAlertMessage("ร้านทดสอบ", 20, 150, sql.NullTime{Time: expiresAt, Valid: true})
	for _, want := range []string{"20 จาก 150 เครดิต", "เครดิตชุดที่ใกล้หมดอายุที่สุด", "14 พ.ย. 2569 เวลา 15:30 น."} {
		if !strings.Contains(balance, want) {
			t.Errorf("balance message missing %q: %s", want, balance)
		}
	}
	if message := balanceAlertMessage("ร้านทดสอบ", 0, 0, sql.NullTime{}); !strings.Contains(message, "เครดิตคงเหลือ 0 เครดิต") || strings.Contains(message, "0 จาก 0") {
		t.Errorf("zero balance message incorrect: %s", message)
	}
}

func TestQuotaAlertPushUsesRetryKey(t *testing.T) {
	const retryKey = "123e4567-e89b-12d3-a456-426614174000"
	var calls int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.URL.Path != "/message/push" || r.Header.Get("X-Line-Retry-Key") != retryKey {
			t.Errorf("unexpected LINE request: %s, retry key %q", r.URL.Path, r.Header.Get("X-Line-Retry-Key"))
		}
		if calls == 2 {
			w.Header().Set("x-line-accepted-request-id", "accepted")
			w.WriteHeader(http.StatusConflict)
		}
	}))
	defer server.Close()

	line := &LINEMessagingService{accessToken: "test", apiEndpoint: server.URL}
	for i := 0; i < 2; i++ {
		if err := line.PushMessageWithRetryKey("Utest", []LINEMessage{BuildTextMessage("low credits")}, retryKey); err != nil {
			t.Fatal(err)
		}
	}
}

func TestLINEDiagnosticsDistinguishRecipientFromMessage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/profile/Utest":
			w.WriteHeader(http.StatusNotFound)
		case "/message/validate/push":
			w.WriteHeader(http.StatusOK)
		case "/info":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"basicId":"@test","displayName":"SlipSure"}`))
		default:
			t.Errorf("unexpected diagnostic path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	line := &LINEMessagingService{accessToken: "test", apiEndpoint: server.URL}
	status, err := line.CheckRecipient("Utest")
	if err != nil || status != http.StatusNotFound {
		t.Fatalf("profile status=%d, err=%v", status, err)
	}
	if err := line.ValidatePushMessage([]LINEMessage{BuildTextMessage("low credits")}); err != nil {
		t.Fatal(err)
	}
	info, err := line.GetBotInfo()
	if err != nil || info.DisplayName != "SlipSure" {
		t.Fatalf("bot info=%+v, err=%v", info, err)
	}
}

func TestQuotaAlertRecipientRejectsInvalidOrUnreachableID(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/profile/U1234567890abcdef1234567890abcdef" {
			t.Errorf("unexpected profile path %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()
	service := NewQuotaAlertService(nil, &LINEMessagingService{accessToken: "test", apiEndpoint: server.URL})
	merchantID := uuid.New()
	if err := service.SetRecipient(context.Background(), merchantID, "not-a-line-id"); !errors.Is(err, ErrInvalidLINEUserID) {
		t.Fatalf("invalid ID error = %v", err)
	}
	if err := service.SetRecipient(context.Background(), merchantID, "U1234567890abcdef1234567890abcdef"); !errors.Is(err, ErrLINERecipientUnavailable) {
		t.Fatalf("unreachable ID error = %v", err)
	}
}
