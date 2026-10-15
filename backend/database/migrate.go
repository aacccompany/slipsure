package database

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log"
)

//go:embed schema.sql migrations/*.sql
var migrationFiles embed.FS

// Only forward migrations belong here. Historical reset scripts and obsolete plan
// seeds are excluded because they would change existing data.
var migrations = []string{
	"000004_add_stripe_columns.sql",
	"20250609_update_line_webhook_columns.up.sql",
	"20250611_create_line_webhook_configs.sql",
	"20260709_add_free_plan_used_to_merchants.sql",
	"20260814_create_line_bot_clients.sql",
	"20261012_add_transaction_provider_details.sql",
	"20261012_seed_three_paid_subscription_plans.sql",
	"20261013_add_subscription_quota_override.sql",
	"20261014_add_user_active_status.sql",
	"20261014_add_credit_lots.sql",
}

// RunMigrations applies pending migrations once, in order. A fresh database is
// initialized from schema.sql; an existing database is never reset.
func RunMigrations() error {
	ctx := context.Background()
	conn, err := DB.Conn(ctx)
	if err != nil {
		return fmt.Errorf("get migration connection: %w", err)
	}
	defer conn.Close()

	// Keep the lock on one connection so concurrent backend instances cannot race.
	if _, err := conn.ExecContext(ctx, "SELECT pg_advisory_lock(74201410)"); err != nil {
		return fmt.Errorf("lock migrations: %w", err)
	}
	defer conn.ExecContext(ctx, "SELECT pg_advisory_unlock(74201410)")

	var usersExists, merchantsExists bool
	var applicationTables int
	if err := conn.QueryRowContext(ctx, `SELECT
		to_regclass('public.users') IS NOT NULL,
		to_regclass('public.merchants') IS NOT NULL,
		(SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'
		 AND tablename IN ('users', 'merchants', 'subscription_plans', 'subscriptions',
		 'payment_logs', 'credit_lots', 'slips', 'transactions', 'notifications',
		 'usage_counters', 'line_webhook_configs', 'line_bot_clients', 'system_logs'))`).Scan(&usersExists, &merchantsExists, &applicationTables); err != nil {
		return fmt.Errorf("check database schema: %w", err)
	}
	if usersExists != merchantsExists || (!usersExists && applicationTables > 0) {
		return fmt.Errorf("database has a partial schema; refusing to initialize it")
	}
	if !usersExists {
		schema, err := migrationFiles.ReadFile("schema.sql")
		if err != nil {
			return fmt.Errorf("read initial schema: %w", err)
		}
		tx, err := conn.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin initial schema: %w", err)
		}
		defer tx.Rollback()
		if _, err := tx.ExecContext(ctx, string(schema)); err != nil {
			return fmt.Errorf("initialize empty database: %w", err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit initial schema: %w", err)
		}
		log.Println("Initialized empty database")
	}

	if _, err := conn.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		name TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`); err != nil {
		return fmt.Errorf("create migration history: %w", err)
	}

	for _, name := range migrations {
		var applied bool
		if err := conn.QueryRowContext(ctx, "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE name = $1)", name).Scan(&applied); err != nil {
			return fmt.Errorf("check migration %s: %w", name, err)
		}
		if applied {
			continue
		}
		contents, err := migrationFiles.ReadFile("migrations/" + name)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", name, err)
		}
		if err := applyMigration(ctx, conn, name, string(contents)); err != nil {
			return err
		}
		log.Printf("Applied migration %s", name)
	}
	return nil
}

func applyMigration(ctx context.Context, conn *sql.Conn, name, contents string) error {
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration %s: %w", name, err)
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, contents); err != nil {
		return fmt.Errorf("apply migration %s: %w", name, err)
	}
	if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (name) VALUES ($1)", name); err != nil {
		return fmt.Errorf("record migration %s: %w", name, err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %s: %w", name, err)
	}
	return nil
}
