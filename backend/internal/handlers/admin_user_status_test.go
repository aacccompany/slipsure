package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestAdminUserStatusRequiresExplicitValue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, body := range []string{`{}`, `{"is_active":null}`} {
		response := httptest.NewRecorder()
		ctx, _ := gin.CreateTestContext(response)
		ctx.Params = gin.Params{{Key: "id", Value: uuid.NewString()}}
		ctx.Request = httptest.NewRequest(http.MethodPatch, "/admin/users/id/status", strings.NewReader(body))
		ctx.Request.Header.Set("Content-Type", "application/json")
		var handler MerchantHandler
		handler.UpdateAdminUserStatus(ctx)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("body %s returned %d, want 400", body, response.Code)
		}
	}
}
