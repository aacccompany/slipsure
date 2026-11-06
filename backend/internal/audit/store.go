package audit

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Entry struct {
	ID         uuid.UUID       `json:"id"`
	AdminID    *uuid.UUID      `json:"admin_id"`
	AdminEmail string          `json:"admin_email"`
	Action     string          `json:"action"`
	Category   string          `json:"category"`
	TargetType string          `json:"target_type"`
	TargetID   *uuid.UUID      `json:"target_id"`
	TargetName string          `json:"target_name"`
	Status     string          `json:"status"`
	IPAddress  string          `json:"ip_address"`
	UserAgent  string          `json:"user_agent"`
	OldValues  json.RawMessage `json:"old_values"`
	NewValues  json.RawMessage `json:"new_values"`
	Metadata   json.RawMessage `json:"metadata"`
	CreatedAt  time.Time       `json:"created_at"`
}

type Filter struct {
	Search   string
	Category string
	Action   string
	Status   string
	AdminID  *uuid.UUID
	TargetID *uuid.UUID
	Start    *time.Time
	End      *time.Time
}

type Store struct{ db *sql.DB }

func NewStore(db *sql.DB) *Store { return &Store{db: db} }

func (s *Store) Write(ctx context.Context, entry Entry) error {
	if entry.Metadata == nil {
		entry.Metadata = json.RawMessage(`{}`)
	}
	_, err := s.db.ExecContext(ctx, `INSERT INTO admin_audit_logs
		(admin_id, admin_email, action, category, target_type, target_id, target_name,
		 status, ip_address, user_agent, old_values, new_values, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13::jsonb)`,
		entry.AdminID, entry.AdminEmail, entry.Action, entry.Category, entry.TargetType,
		entry.TargetID, entry.TargetName, entry.Status, entry.IPAddress, entry.UserAgent,
		nullJSON(entry.OldValues), nullJSON(entry.NewValues), string(entry.Metadata))
	return err
}

func nullJSON(value json.RawMessage) interface{} {
	if len(value) == 0 {
		return nil
	}
	return string(value)
}

// Snapshot only selects fields approved for audit history. Never serialize a full model.
func (s *Store) Snapshot(ctx context.Context, targetType string, id uuid.UUID) (json.RawMessage, string, error) {
	var raw []byte
	var name string
	var query string
	switch targetType {
	case "user":
		query = `SELECT jsonb_build_object('name', name, 'email', email, 'role', role,
			'is_active', is_active), COALESCE(email, name) FROM users WHERE id = $1`
	case "merchant_quota":
		query = `SELECT jsonb_build_object('plan', p.name, 'quota_extra', COALESCE(s.quota_override, 0),
			'extra_expires_at', (SELECT MAX(expires_at) FROM credit_lots
			 WHERE merchant_id = m.id AND grant_source = 'admin_extra' AND expires_at > CURRENT_TIMESTAMP)), m.shop_name
			FROM merchants m LEFT JOIN subscriptions s ON s.merchant_id = m.id
			LEFT JOIN subscription_plans p ON p.id = s.plan_id WHERE m.id = $1`
	case "merchant_alert":
		query = `SELECT jsonb_build_object('custom_recipient_configured',
			COALESCE(quota_alert_recipient_line_user_id, '') <> ''), shop_name
			FROM merchants WHERE id = $1`
	case "merchant":
		query = `SELECT jsonb_build_object('shop_name', shop_name, 'is_active', is_active), shop_name
			FROM merchants WHERE id = $1`
	default:
		return nil, "", nil
	}
	if err := s.db.QueryRowContext(ctx, query, id).Scan(&raw, &name); err != nil {
		return nil, "", err
	}
	return raw, name, nil
}

func (s *Store) Actor(ctx context.Context, id uuid.UUID) (string, bool, error) {
	var email string
	var role string
	err := s.db.QueryRowContext(ctx, `SELECT COALESCE(email, ''), role::text FROM users WHERE id = $1`, id).Scan(&email, &role)
	return email, role == "admin", err
}

func (s *Store) AdminByEmail(ctx context.Context, email string) (*uuid.UUID, bool, error) {
	var id uuid.UUID
	err := s.db.QueryRowContext(ctx, `SELECT id FROM users WHERE lower(email) = lower($1) AND role = 'admin'`, email).Scan(&id)
	if err == sql.ErrNoRows {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return &id, true, nil
}

func (f Filter) where() (string, []interface{}) {
	var conditions []string
	var args []interface{}
	add := func(clause string, value interface{}) {
		args = append(args, value)
		conditions = append(conditions, fmt.Sprintf(clause, len(args)))
	}
	if f.Search != "" {
		args = append(args, "%"+f.Search+"%")
		index := len(args)
		conditions = append(conditions, fmt.Sprintf(`(admin_email ILIKE $%d OR target_name ILIKE $%d OR action ILIKE $%d)`, index, index, index))
	}
	if f.Category != "" {
		add("category = $%d", f.Category)
	}
	if f.Action != "" {
		add("action = $%d", f.Action)
	}
	if f.Status != "" {
		add("status = $%d", f.Status)
	}
	if f.AdminID != nil {
		add("admin_id = $%d", *f.AdminID)
	}
	if f.TargetID != nil {
		add("target_id = $%d", *f.TargetID)
	}
	if f.Start != nil {
		add("created_at >= $%d", *f.Start)
	}
	if f.End != nil {
		add("created_at < $%d", *f.End)
	}
	if len(conditions) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(conditions, " AND "), args
}

const entryColumns = `id, admin_id, COALESCE(admin_email, ''), action, category,
	COALESCE(target_type, ''), target_id, COALESCE(target_name, ''), status,
	COALESCE(ip_address, ''), COALESCE(user_agent, ''), old_values, new_values,
	metadata, created_at`

func scanEntry(scanner interface{ Scan(...interface{}) error }) (Entry, error) {
	var entry Entry
	var adminID, targetID uuid.NullUUID
	var oldValues, newValues []byte
	err := scanner.Scan(&entry.ID, &adminID, &entry.AdminEmail, &entry.Action, &entry.Category,
		&entry.TargetType, &targetID, &entry.TargetName, &entry.Status, &entry.IPAddress,
		&entry.UserAgent, &oldValues, &newValues, &entry.Metadata, &entry.CreatedAt)
	if adminID.Valid {
		entry.AdminID = &adminID.UUID
	}
	if targetID.Valid {
		entry.TargetID = &targetID.UUID
	}
	entry.OldValues, entry.NewValues = oldValues, newValues
	return entry, err
}

func (s *Store) List(ctx context.Context, filter Filter, limit, offset int) ([]Entry, int, error) {
	where, args := filter.where()
	var total int
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM admin_audit_logs"+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	query := "SELECT " + entryColumns + " FROM admin_audit_logs" + where +
		fmt.Sprintf(" ORDER BY created_at DESC, id DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	rows, err := s.db.QueryContext(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := make([]Entry, 0)
	for rows.Next() {
		entry, err := scanEntry(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, entry)
	}
	return items, total, rows.Err()
}

func (s *Store) Get(ctx context.Context, id uuid.UUID) (Entry, error) {
	return scanEntry(s.db.QueryRowContext(ctx, "SELECT "+entryColumns+" FROM admin_audit_logs WHERE id = $1", id))
}

func (s *Store) Export(ctx context.Context, filter Filter, consume func(Entry) error) error {
	where, args := filter.where()
	rows, err := s.db.QueryContext(ctx, "SELECT "+entryColumns+" FROM admin_audit_logs"+where+" ORDER BY created_at DESC, id DESC", args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		entry, err := scanEntry(rows)
		if err != nil {
			return err
		}
		if err := consume(entry); err != nil {
			return err
		}
	}
	return rows.Err()
}
