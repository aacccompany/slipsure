package handlers

import (
	"bytes"
	"database/sql"
	"encoding/csv"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"slipsure-backend/internal/audit"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AdminAuditHandler struct{ store *audit.Store }

func NewAdminAuditHandler(store *audit.Store) *AdminAuditHandler {
	return &AdminAuditHandler{store: store}
}

func readAuditFilter(c *gin.Context) (audit.Filter, bool) {
	f := audit.Filter{
		Search: strings.TrimSpace(c.Query("search")), Category: c.Query("category"),
		Action: c.Query("action"), Status: c.Query("status"),
	}
	if len(f.Search) > 200 || len(f.Category) > 40 || len(f.Action) > 80 ||
		(f.Status != "" && f.Status != "success" && f.Status != "failed") {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "INVALID_FILTER"})
		return f, false
	}
	for _, field := range []struct {
		name string
		dest **uuid.UUID
	}{{"admin_id", &f.AdminID}, {"target_id", &f.TargetID}} {
		if value := c.Query(field.name); value != "" {
			id, err := uuid.Parse(value)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "INVALID_FILTER", "message": field.name + " must be a UUID"})
				return f, false
			}
			*field.dest = &id
		}
	}
	loc, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "TIMEZONE_ERROR"})
		return f, false
	}
	for _, field := range []struct {
		name string
		dest **time.Time
	}{{"start_date", &f.Start}, {"end_date", &f.End}} {
		if value := c.Query(field.name); value != "" {
			day, err := time.ParseInLocation("2006-01-02", value, loc)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "INVALID_FILTER", "message": field.name + " must be YYYY-MM-DD"})
				return f, false
			}
			if field.name == "end_date" {
				day = day.AddDate(0, 0, 1)
			}
			*field.dest = &day
		}
	}
	if f.Start != nil && f.End != nil && !f.Start.Before(*f.End) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "INVALID_FILTER", "message": "end_date must be on or after start_date"})
		return f, false
	}
	return f, true
}

func (h *AdminAuditHandler) List(c *gin.Context) {
	filter, ok := readAuditFilter(c)
	if !ok {
		return
	}
	page, limit := readPagination(c, 20)
	if limit > 100 {
		limit = 100
	}
	items, total, err := h.store.List(c.Request.Context(), filter, limit, (page-1)*limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "DATABASE_ERROR"})
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"items": items, "pagination": buildPagination(page, limit, total),
	}})
}

func (h *AdminAuditHandler) Detail(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "INVALID_ID"})
		return
	}
	entry, err := h.store.Get(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "NOT_FOUND"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "DATABASE_ERROR"})
		}
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.JSON(http.StatusOK, gin.H{"success": true, "data": entry})
}

func safeAuditCSV(value string) string {
	trimmed := strings.TrimLeft(value, " \t\r\n")
	if trimmed != "" && strings.ContainsRune("=+-@", rune(trimmed[0])) {
		return "'" + value
	}
	return value
}

func (h *AdminAuditHandler) Export(c *gin.Context) {
	if format := c.DefaultQuery("format", "csv"); format != "csv" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "INVALID_FORMAT"})
		return
	}
	filter, ok := readAuditFilter(c)
	if !ok {
		return
	}
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	_ = writer.Write([]string{"id", "created_at", "admin_id", "admin_email", "action", "category", "target_type", "target_id", "target_name", "status", "ip_address", "user_agent", "old_values", "new_values", "metadata"})
	err := h.store.Export(c.Request.Context(), filter, func(entry audit.Entry) error {
		adminID := ""
		if entry.AdminID != nil {
			adminID = entry.AdminID.String()
		}
		targetID := ""
		if entry.TargetID != nil {
			targetID = entry.TargetID.String()
		}
		return writer.Write([]string{entry.ID.String(), entry.CreatedAt.Format(time.RFC3339), adminID,
			safeAuditCSV(entry.AdminEmail), entry.Action, entry.Category, entry.TargetType,
			targetID, safeAuditCSV(entry.TargetName), entry.Status, entry.IPAddress,
			safeAuditCSV(entry.UserAgent), safeAuditCSV(string(entry.OldValues)),
			safeAuditCSV(string(entry.NewValues)), safeAuditCSV(string(entry.Metadata))})
	})
	writer.Flush()
	if err == nil {
		err = writer.Error()
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "EXPORT_FAILED"})
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="admin-logs-%s.csv"`, time.Now().Format("20060102")))
	c.Data(http.StatusOK, "text/csv; charset=utf-8", append([]byte{0xEF, 0xBB, 0xBF}, buffer.Bytes()...))
}
