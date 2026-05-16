package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"slipsure-backend/database"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env vars")
	}

	// Initialize database
	if err := initializeDatabase(); err != nil {
		log.Fatal("❌ Database initialization failed:", err)
	}
	defer database.Close()

	// Get port from env or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Set Gin mode
	env := os.Getenv("ENV")
	if env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create router
	router := gin.Default()

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "Slip Verification API",
			"version": "1.0.0",
			"port":    port,
			"database": "connected",
		})
	})

	// API v1 routes will be added here
	v1 := router.Group("/v1")
	{
		// TODO: Add API endpoints as per api-spec-and-db-schema.md
		v1.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "Slip Verification API v1",
				"docs":    "See api-spec-and-db-schema.md for endpoint documentation",
			})
		})
	}

	// Start server
	log.Printf("🚀 Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("❌ Failed to start server:", err)
	}
}

func initializeDatabase() error {
	log.Println("🔧 Initializing database...")

	// Set database environment variables
	os.Setenv("DB_HOST", os.Getenv("DB_HOST"))
	os.Setenv("DB_PORT", os.Getenv("DB_PORT"))
	os.Setenv("DB_USER", "slipverify")
	os.Setenv("DB_PASSWORD", "slipverify1234")
	os.Setenv("DB_NAME", "slipsure")

	// Create database if it doesn't exist
	if err := database.CreateDatabase(); err != nil {
		return err
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		return err
	}

	// Run migrations
	if err := database.RunMigrations(); err != nil {
		return err
	}

	return nil
}
