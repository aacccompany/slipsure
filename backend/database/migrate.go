package database

import (
	_ "embed"
	"log"
)

//go:embed schema.sql
var schemaSQL string

// RunMigrations executes the database schema
func RunMigrations() error {
	log.Println("🔄 Running database migrations...")

	_, err := DB.Exec(schemaSQL)
	if err != nil {
		return err
	}

	log.Println("✅ Database migrations completed successfully")
	return nil
}