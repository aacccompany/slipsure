package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"slipsure-backend/internal/models"
	"slipsure-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type blockedAuthService struct{ services.AuthService }

func (blockedAuthService) Login(*models.LoginRequest) (*models.AuthResponse, error) {
	return nil, services.ErrAccountBlocked
}
func (blockedAuthService) LineLogin(*models.LineLoginRequest) (*models.LineLoginResponse, error) {
	return nil, services.ErrAccountBlocked
}
func (blockedAuthService) VerifyOTP(*models.VerifyOTPRequest) (*models.VerifyOTPResponse, error) {
	return nil, services.ErrAccountBlocked
}

func TestBlockedAuthResponsesTellUserToContactAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewAuthHandler(blockedAuthService{})
	for _, tc := range []struct {
		name, body string
		handle     gin.HandlerFunc
	}{
		{"password", `{"email":"blocked@example.com","password":"correct-password"}`, handler.Login},
		{"line", `{"line_code":"code","redirect_uri":"http://localhost/callback"}`, handler.LineLogin},
		{"otp", `{"email":"blocked@example.com","otp":"123456"}`, handler.VerifyOTP},
	} {
		t.Run(tc.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(response)
			ctx.Request = httptest.NewRequest(http.MethodPost, "/auth", strings.NewReader(tc.body))
			ctx.Request.Header.Set("Content-Type", "application/json")
			tc.handle(ctx)
			if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), `"ACCOUNT_BLOCKED"`) ||
				!strings.Contains(response.Body.String(), "กรุณาติดต่อผู้ดูแลระบบ") {
				t.Fatalf("response = %d %s", response.Code, response.Body.String())
			}
		})
	}
}
