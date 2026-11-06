package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"slipsure-backend/internal/audit"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type auditAction struct {
	action, category, targetType, snapshotType string
}

func adminAction(method, path string) (auditAction, bool) {
	switch method + " " + path {
	case "PATCH /v1/admin/users/:id/status":
		return auditAction{"UPDATE_USER_STATUS", "user", "user", "user"}, true
	case "PUT /v1/admin/merchants/:id/quota":
		return auditAction{"ADJUST_MERCHANT_QUOTA", "subscription", "merchant", "merchant_quota"}, true
	case "PUT /v1/admin/merchants/:id/quota-alert-recipient":
		return auditAction{"UPDATE_ALERT_RECIPIENT", "configuration", "merchant", "merchant_alert"}, true
	case "GET /v1/admin/merchants/:id":
		return auditAction{"VIEW_MERCHANT_DETAIL", "merchant", "merchant", "merchant"}, true
	case "GET /v1/admin/payments/:id":
		return auditAction{"VIEW_PAYMENT_DETAIL", "payment", "payment", ""}, true
	case "GET /v1/admin/logs/:id":
		return auditAction{"VIEW_AUDIT_DETAIL", "security", "audit_log", ""}, true
	case "GET /v1/admin/users/export":
		return auditAction{"EXPORT_USERS", "export", "report", ""}, true
	case "GET /v1/admin/merchants/export":
		return auditAction{"EXPORT_MERCHANTS", "export", "report", ""}, true
	case "GET /v1/admin/payments/export":
		return auditAction{"EXPORT_PAYMENTS", "export", "report", ""}, true
	case "GET /v1/admin/slip-history/export":
		return auditAction{"EXPORT_SLIPS", "export", "report", ""}, true
	case "POST /v1/admin/reports/export":
		return auditAction{"EXPORT_PLATFORM_REPORT", "export", "report", ""}, true
	case "GET /v1/admin/logs/export":
		return auditAction{"EXPORT_AUDIT_LOGS", "security", "report", ""}, true
	}
	if method != http.MethodGet && method != http.MethodHead && method != http.MethodOptions {
		return auditAction{"ADMIN_MUTATION", "security", "", ""}, true
	}
	return auditAction{}, false
}

func writeAudit(store *audit.Store, entry audit.Entry) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := store.Write(ctx, entry); err != nil {
		log.Printf("Admin audit write failed for %s: %v", entry.Action, err)
	}
}

func auditRequestInfo(c *gin.Context, entry *audit.Entry) {
	entry.IPAddress = c.ClientIP()
	if len(entry.IPAddress) > 45 {
		entry.IPAddress = entry.IPAddress[:45]
	}
	entry.UserAgent = c.Request.UserAgent()
	if len(entry.UserAgent) > 500 {
		entry.UserAgent = entry.UserAgent[:500]
	}
}

// AuditDeniedAdminAccess must run before auth/role middleware.
func AuditDeniedAdminAccess(store *audit.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		if (c.Writer.Status() != http.StatusUnauthorized && c.Writer.Status() != http.StatusForbidden) || c.GetBool("audit_authorized") {
			return
		}
		entry := audit.Entry{Action: "ADMIN_ACCESS_DENIED", Category: "security", Status: "failed"}
		entry.Metadata, _ = json.Marshal(map[string]interface{}{
			"http_status": c.Writer.Status(), "method": c.Request.Method,
			"path": c.FullPath(), "error_code": "ACCESS_DENIED",
		})
		auditRequestInfo(c, &entry)
		if actorID, err := uuid.Parse(c.GetString("user_id")); err == nil {
			entry.AdminID = &actorID
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			entry.AdminEmail, _, _ = store.Actor(ctx, actorID)
			cancel()
		}
		writeAudit(store, entry)
	}
}

func RequireCurrentAdmin(store *audit.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := uuid.Parse(c.GetString("user_id"))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false, "error": "FORBIDDEN"})
			return
		}
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		_, isAdmin, err := store.Actor(ctx, id)
		cancel()
		if err != nil || !isAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false, "error": "FORBIDDEN"})
			return
		}
		c.Set("audit_authorized", true)
		c.Next()
	}
}

// AuditAdminAction records only selected admin actions and never logs request bodies.
func AuditAdminAction(store *audit.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		definition, tracked := adminAction(c.Request.Method, c.FullPath())
		if !tracked {
			c.Next()
			return
		}
		entry := audit.Entry{Action: definition.action, Category: definition.category,
			TargetType: definition.targetType}
		if id, err := uuid.Parse(c.GetString("user_id")); err == nil {
			entry.AdminID = &id
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			entry.AdminEmail, _, _ = store.Actor(ctx, id)
			cancel()
		}
		if targetID, err := uuid.Parse(c.Param("id")); err == nil {
			entry.TargetID = &targetID
			if definition.snapshotType != "" {
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				before, name, snapshotErr := store.Snapshot(ctx, definition.snapshotType, targetID)
				cancel()
				if snapshotErr == nil {
					entry.TargetName = name
					if c.Request.Method != http.MethodGet {
						entry.OldValues = before
					}
				}
			}
		}
		if strings.HasPrefix(definition.action, "EXPORT_") {
			entry.TargetName = strings.TrimPrefix(definition.action, "EXPORT_")
		}
		c.Next()
		if c.Writer.Status() >= 400 {
			entry.Status = "failed"
		} else {
			entry.Status = "success"
			if entry.TargetID != nil && definition.snapshotType != "" && c.Request.Method != http.MethodGet {
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				after, _, snapshotErr := store.Snapshot(ctx, definition.snapshotType, *entry.TargetID)
				cancel()
				if snapshotErr == nil {
					entry.NewValues = after
				}
			}
		}
		metadata := map[string]interface{}{
			"http_status": c.Writer.Status(), "method": c.Request.Method,
		}
		if entry.Status == "failed" {
			metadata["error_code"] = http.StatusText(c.Writer.Status())
		}
		entry.Metadata, _ = json.Marshal(metadata)
		auditRequestInfo(c, &entry)
		writeAudit(store, entry)
	}
}
