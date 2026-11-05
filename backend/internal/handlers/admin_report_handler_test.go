package handlers

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"slipsure-backend/internal/services"
	"slipsure-backend/middleware"

	"github.com/gin-gonic/gin"
)

type adminReportFakeDriver struct {
	role                 string
	auditWrites, updates int
}

func (d *adminReportFakeDriver) Open(string) (driver.Conn, error) {
	return &adminReportFakeConn{driver: d}, nil
}

type adminReportFakeConn struct{ driver *adminReportFakeDriver }

func (c *adminReportFakeConn) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("not supported")
}
func (c *adminReportFakeConn) Close() error              { return nil }
func (c *adminReportFakeConn) Begin() (driver.Tx, error) { return nil, errors.New("not supported") }
func (c *adminReportFakeConn) QueryContext(_ context.Context, query string, _ []driver.NamedValue) (driver.Rows, error) {
	if strings.Contains(query, "FROM users") {
		return &adminReportFakeRows{columns: []string{"role", "is_active"}, values: []driver.Value{c.driver.role, true}}, nil
	}
	if strings.Contains(query, "INSERT INTO system_logs") {
		c.driver.auditWrites++
		return &adminReportFakeRows{columns: []string{"id"}, values: []driver.Value{"119eabf0-53ae-4891-9618-c5e87a9449d7"}}, nil
	}
	return nil, errors.New("unexpected query")
}
func (c *adminReportFakeConn) ExecContext(_ context.Context, query string, _ []driver.NamedValue) (driver.Result, error) {
	if !strings.Contains(query, "UPDATE system_logs") {
		return nil, errors.New("unexpected exec")
	}
	c.driver.updates++
	return driver.RowsAffected(1), nil
}

type adminReportFakeRows struct {
	columns []string
	values  []driver.Value
	read    bool
}

func (r *adminReportFakeRows) Columns() []string { return r.columns }
func (r *adminReportFakeRows) Close() error      { return nil }
func (r *adminReportFakeRows) Next(dest []driver.Value) error {
	if r.read {
		return io.EOF
	}
	copy(dest, r.values)
	r.read = true
	return nil
}

type adminReportFakeBuilder struct{}

func (adminReportFakeBuilder) Build(context.Context, services.AdminReportPeriod) ([]byte, error) {
	return []byte("xlsx"), nil
}

func TestAdminReportPeriodBangkok(t *testing.T) {
	now := time.Date(2026, 11, 3, 12, 0, 0, 0, time.UTC)
	period, err := parseAdminPeriod(adminReportRequest{ReportPeriod: "custom", StartDate: "2024-07-01", EndDate: "2024-07-31"}, now)
	if err != nil {
		t.Fatal(err)
	}
	if got := period.Start.UTC().Format(time.RFC3339); got != "2024-06-30T17:00:00Z" {
		t.Fatalf("start UTC = %s", got)
	}
	if got := period.End.UTC().Format(time.RFC3339); got != "2024-07-31T17:00:00Z" {
		t.Fatalf("end exclusive UTC = %s", got)
	}
	if _, err := parseAdminPeriod(adminReportRequest{ReportPeriod: "custom", StartDate: "2024-07-31", EndDate: "2024-07-01"}, now); err == nil {
		t.Fatal("reversed date range accepted")
	}
	if all, err := parseAdminPeriod(adminReportRequest{}, now); err != nil || all.Start != nil {
		t.Fatalf("default should be all time: %#v, %v", all, err)
	}
}

func TestAdminReportRouteRejectsMerchant(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/v1/admin/reports/export", func(c *gin.Context) {
		c.Set("user_role", c.GetHeader("X-Test-Role"))
		c.Next()
	}, middleware.RequireRole("admin"), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	for _, role := range []string{"merchant", ""} {
		request := httptest.NewRequest(http.MethodPost, "/v1/admin/reports/export", strings.NewReader(`{"report_period":"all"}`))
		request.Header.Set("X-Test-Role", role)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != http.StatusForbidden {
			t.Fatalf("role %q got %d, want 403", role, response.Code)
		}
	}
}

func TestAdminReportChecksCurrentDBRoleAndAudits(t *testing.T) {
	for _, tc := range []struct {
		name, dbRole string
		wantStatus   int
		wantAudit    int
	}{
		{name: "demoted", dbRole: "merchant", wantStatus: http.StatusForbidden},
		{name: "authorized", dbRole: "admin", wantStatus: http.StatusOK, wantAudit: 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			fake := &adminReportFakeDriver{role: tc.dbRole}
			driverName := fmt.Sprintf("admin-report-%s-%d", tc.name, time.Now().UnixNano())
			sql.Register(driverName, fake)
			db, err := sql.Open(driverName, "")
			if err != nil {
				t.Fatal(err)
			}
			defer db.Close()
			gin.SetMode(gin.TestMode)
			router := gin.New()
			handler := &AdminReportHandler{db: db, reports: adminReportFakeBuilder{}}
			router.POST("/v1/admin/reports/export", func(c *gin.Context) {
				c.Set("user_id", "079eabf0-53ae-4891-9618-c5e87a9449d7")
				c.Set("user_role", "admin")
				c.Next()
			}, middleware.RequireRole("admin"), handler.Export)
			request := httptest.NewRequest(http.MethodPost, "/v1/admin/reports/export", strings.NewReader(`{"report_period":"all","export_type":"full","format":"xlsx","timezone":"Asia/Bangkok"}`))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != tc.wantStatus || fake.auditWrites != tc.wantAudit {
				t.Fatalf("status %d, audit inserts %d", response.Code, fake.auditWrites)
			}
			if tc.wantStatus == http.StatusOK && (fake.updates != 1 || response.Header().Get("Cache-Control") != "no-store") {
				t.Fatalf("audit update %d, cache-control %q", fake.updates, response.Header().Get("Cache-Control"))
			}
		})
	}
}
