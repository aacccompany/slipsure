package audit

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestFilterWhereUsesParametersForEveryField(t *testing.T) {
	id := uuid.New()
	now := time.Now()
	where, args := (Filter{
		Search: "shop' OR TRUE", Category: "subscription", Action: "ADJUST_MERCHANT_QUOTA",
		Status: "failed", AdminID: &id, TargetID: &id, Start: &now, End: &now,
	}).where()
	if len(args) != 8 {
		t.Fatalf("got %d args, want 8", len(args))
	}
	if strings.Contains(where, "shop' OR TRUE") || !strings.Contains(where, "admin_email ILIKE $1 OR target_name ILIKE $1 OR action ILIKE $1") {
		t.Fatalf("unsafe or wrong search clause: %s", where)
	}
	if !strings.Contains(where, "created_at < $8") {
		t.Fatalf("missing exclusive end date: %s", where)
	}
}

func TestNullJSONUsesTextForPostgresJSONB(t *testing.T) {
	if nullJSON(nil) != nil {
		t.Fatal("nil JSON should become SQL NULL")
	}
	if got := nullJSON(json.RawMessage(`{"is_active":true}`)); got != `{"is_active":true}` {
		t.Fatalf("got %#v", got)
	}
}
