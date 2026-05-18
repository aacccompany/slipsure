package main

import (
	"fmt"
	"log"
	"os"

	"slipsure-backend/database"
	"slipsure-backend/internal/handlers"
	"slipsure-backend/internal/repositories"
	"slipsure-backend/internal/services"
	"slipsure-backend/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Check if running migration command
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		if err := runMigrations(); err != nil {
			log.Fatal(" Migration failed:", err)
		}
		return
	}

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env vars")
	}

	// Create database if it doesn't exist
	if err := database.CreateDatabase(); err != nil {
		log.Printf("Warning: Failed to create database: %v", err)
		log.Println("Attempting to connect anyway...")
	}

	// Connect to database
	if err := connectDatabase(); err != nil {
		log.Fatal(" Database connection failed:", err)
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

	// Initialize repositories
	userRepo := repositories.NewUserRepository(database.DB)

	// Initialize Redis OTP service
	redisAddr := os.Getenv("REDIS_URL")
	if redisAddr == "" {
		// Check if running in Docker
		if os.Getenv("DOCKER_ENV") == "true" {
			redisAddr = "redis:6379" // Docker service name
		} else {
			redisAddr = "localhost:6379" // Local development
		}
	}

	emailService := services.NewEmailService()

	// Initialize Redis OTP service (no fallback - Redis only!)
	otpService, err := services.NewRedisOTPService(redisAddr, emailService)
	if err != nil {
		log.Fatalf("❌ Failed to initialize Redis OTP service: %v", err)
	}
	defer otpService.Close()

	// Initialize LINE OAuth service (optional - can fail gracefully)
	log.Println("🔧 Attempting to initialize LINE OAuth service...")
	var lineOAuth *services.LineOAuthService
	if lineOAuth, err = services.NewLineOAuthService(); err != nil {
		log.Printf("⚠️  Warning: Failed to initialize LINE OAuth service: %v", err)
		log.Println("📱 LINE login functionality will be unavailable")
	} else {
		log.Println("✅ LINE OAuth service initialized successfully")
	}

	// Initialize services with dependency injection
	authService := services.NewAuthServiceWithOTP(userRepo, otpService, lineOAuth)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":   "ok",
			"service":  "Slip Verification API",
			"version":  "1.0.0",
			"port":     port,
			"database": "connected",
		})
	})

	// API v1 routes
	v1 := router.Group("/v1")
	{
		// Auth routes (public)
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/verify-otp", authHandler.VerifyOTP)
			auth.POST("/resend-otp", authHandler.ResendOTP)
			auth.POST("/login", authHandler.Login)
			auth.POST("/line-login", authHandler.LineLogin)
			auth.POST("/forgot-password", authHandler.ForgotPassword)
			auth.POST("/reset-password", authHandler.ResetPassword)
		}

		// Protected routes (require authentication)
		protected := v1.Group("/auth")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/me", authHandler.GetProfile)
			protected.PUT("/profile", authHandler.UpdateProfile)
			protected.POST("/logout", authHandler.Logout)
		}

		// Alternative protected routes
		altProtected := v1.Group("")
		altProtected.Use(middleware.AuthMiddleware())
		{
			altProtected.GET("/me", func(c *gin.Context) {
				userID := c.GetString("user_id")
				userEmail := c.GetString("user_email")
				userRole := c.GetString("user_role")

				c.JSON(200, gin.H{
					"message": "Access granted to protected route",
					"user_id": userID,
					"email":   userEmail,
					"role":    userRole,
				})
			})
		}

		// API info
		v1.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "Slip Verification API v1",
				"docs":    "See api-spec-and-db-schema.md for endpoint documentation",
			})
		})
	}

	// Start server
	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(" Failed to start server:", err)
	}
}

// connectDatabase connects to the existing database
func connectDatabase() error {
	log.Println(" Connecting to database...")

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		host := "localhost"
		if os.Getenv("DOCKER_ENV") == "true" {
			host = "postgres"
		}
		dbURL = fmt.Sprintf("postgresql://slipverify:slipverify1234@%s:5432/slipsure?sslmode=disable", host)
	}

	// Set DB_URL for the database package to use
	os.Setenv("DB_URL", dbURL)

	// Connect using the database package
	if err := database.Connect(); err != nil {
		return err
	}

	log.Println(" Database connected successfully")
	return nil
}

// runMigrations runs database migrations manually
func runMigrations() error {
	log.Println(" Running database migrations...")

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env vars")
	}

	// First create the database if it doesn't exist
	log.Println(" Creating database if not exists...")
	if err := database.CreateDatabase(); err != nil {
		return fmt.Errorf("failed to create database: %w", err)
	}

	// Connect to database
	if err := connectDatabase(); err != nil {
		return err
	}
	defer database.Close()

	// Run migrations
	if err := database.RunMigrations(); err != nil {
		return err
	}

	log.Println(" Migrations completed successfully")
	return nil
}
