package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// Connect establishes connection to PostgreSQL database
func Connect() error {
	// Use DB_URL if available (from docker-compose), otherwise build from components
	dbURL := getEnv("DB_URL", "")
	if dbURL == "" {
		// Fallback to DATABASE_URL or build from components
		dbURL = getEnv("DATABASE_URL", "")
		if dbURL == "" {
			host := getEnv("DB_HOST", "postgres")
			port := getEnv("DB_PORT", "5432")
			user := getEnv("DB_USER", "slipverify")
			password := getEnv("DB_PASSWORD", "slipverify1234")
			dbname := getEnv("DB_NAME", "slipsure")
			dbURL = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
				host, port, user, password, dbname)
		}
	}

	var err error
	DB, err = sql.Open("postgres", dbURL)
	if err != nil {
		return fmt.Errorf("error opening database: %w", err)
	}

	// Test connection
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("error connecting to database: %w", err)
	}

	// Set connection pool settings
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)

	log.Println(" Database connected successfully")
	return nil
}

// Close closes the database connection
func Close() {
	if DB != nil {
		DB.Close()
		log.Println(" Database connection closed")
	}
}

// CreateDatabase creates the slipsure database if it doesn't exist
func CreateDatabase() error {
	// Connect to default postgres database first
	host := getEnv("DB_HOST", "postgres")

	// Use localhost if not in Docker environment
	if getEnv("DOCKER_ENV", "") != "true" {
		host = "localhost"
	}

	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "slipverify")
	password := getEnv("DB_PASSWORD", "slipverify1234")
	dbname := getEnv("DB_NAME", "slipsure")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=postgres sslmode=disable",
		host, port, user, password)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("error opening database: %w", err)
	}
	defer db.Close()

	// Check if database exists
	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)", dbname).Scan(&exists)
	if err != nil {
		return fmt.Errorf("error checking database existence: %w", err)
	}

	if !exists {
		// Create database
		_, err = db.Exec(fmt.Sprintf("CREATE DATABASE %s", dbname))
		if err != nil {
			return fmt.Errorf("error creating database: %w", err)
		}
		log.Printf("✅ Database '%s' created", dbname)
	} else {
		log.Printf("✅ Database '%s' already exists", dbname)
	}

	return nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
