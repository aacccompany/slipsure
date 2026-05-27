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
	var err error
	// Initialize Redis OTP service (optional - can fail gracefully in development)
	log.Println(" Attempting to initialize Redis OTP service...")
	var otpService *services.RedisOTPService
	if otpService, err = services.NewRedisOTPService(redisAddr, emailService); err != nil {
		log.Printf(" Warning: Failed to initialize Redis OTP service: %v", err)
		log.Println(" OTP functionality will be unavailable. Start Redis server for full functionality.")
		log.Println(" To enable OTP: 1) Install Redis, 2) Start Redis server, 3) Restart this API")
	} else {
		log.Println(" Redis OTP service initialized successfully")
		defer otpService.Close()
	}

	// Initialize LINE OAuth service (optional - can fail gracefully)
	log.Println(" Attempting to initialize LINE OAuth service...")
	var lineOAuth *services.LineOAuthService
	if lineOAuth, err = services.NewLineOAuthService(); err != nil {
		log.Printf(" Warning: Failed to initialize LINE OAuth service: %v", err)
		log.Println(" LINE login functionality will be unavailable")
	} else {
		log.Println(" LINE OAuth service initialized successfully")
	}

	// Initialize merchant repository and Stripe service first (needed by auth)
	log.Println(" Attempting to initialize Stripe service...")
	var stripeService *services.StripeService
	if stripeService, err = services.NewStripeService(); err != nil {
		log.Printf(" Warning: Failed to initialize Stripe service: %v", err)
		log.Println(" Stripe checkout functionality will be unavailable")
	} else {
		log.Println(" Stripe service initialized successfully")
	}

	merchantRepo := repositories.NewMerchantRepository(database.DB)
	merchantService := services.NewMerchantService(merchantRepo, stripeService, userRepo)
	merchantHandler := handlers.NewMerchantHandler(merchantService, stripeService, userRepo, merchantRepo)

	// Initialize storage service (DigitalOcean Spaces)
	log.Println(" Attempting to initialize DigitalOcean Spaces storage service...")
	storageService, err := services.NewStorageService()
	if err != nil {
		log.Printf(" Warning: Failed to initialize storage service: %v", err)
		log.Println(" File upload functionality will be limited")
		// Create a nil storage service to prevent panic
		storageService = nil
	} else {
		log.Println(" DigitalOcean Spaces storage service initialized successfully")
	}

	// Initialize slip verification service
	slipRepo := repositories.NewSlipRepository(database.DB)
	transactionRepo := repositories.NewTransactionRepository(database.DB)
	usageCounterRepo := repositories.NewUsageCounterRepository(database.DB)
	slipVerificationService := services.NewSlipVerificationService(slipRepo, transactionRepo, usageCounterRepo, storageService)
	slipHandler := handlers.NewSlipHandler(slipVerificationService, userRepo)

	// Initialize LINE messaging service (optional - can fail gracefully)
	log.Println(" Attempting to initialize LINE Messaging service...")
	var lineMessagingService *services.LINEMessagingService
	if lineMessagingService, err = services.NewLINEMessagingService(); err != nil {
		log.Printf(" Warning: Failed to initialize LINE Messaging service: %v", err)
		log.Println(" LINE Bot functionality will be unavailable")
	} else {
		log.Println(" LINE Messaging service initialized successfully")
	}

	// Initialize LINE webhook handler
	var lineWebhookHandler *handlers.LINEWebhookHandler
	if lineMessagingService != nil {
		lineWebhookHandler = handlers.NewLINEWebhookHandler(lineMessagingService, slipVerificationService, merchantRepo, userRepo)
	}

	// Initialize services with dependency injection
	authService := services.NewAuthServiceWithOTP(userRepo, merchantRepo, otpService, lineOAuth)

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

		// Protected routes (require authentication + email verification)
		protected := v1.Group("/auth")
		protected.Use(middleware.AuthMiddleware())
		protected.Use(middleware.EmailVerificationMiddleware(userRepo))
		{
			protected.GET("/me", authHandler.GetProfile)
			protected.PUT("/profile", authHandler.UpdateProfile)
			protected.POST("/connect-line", authHandler.ConnectLineAccount)
			protected.POST("/logout", authHandler.Logout)
		}

		// Merchant & Subscription routes (public)
		v1.GET("/plans", merchantHandler.GetPlans)
		v1.POST("/checkout/webhook", merchantHandler.HandleStripeWebhook)

		// Checkout routes (protected + email verification required)
		checkout := v1.Group("/checkout")
		checkout.Use(middleware.AuthMiddleware())
		checkout.Use(middleware.EmailVerificationMiddleware(userRepo))
		{
			checkout.POST("", merchantHandler.CreateCheckout)
		}

		// Merchant routes (protected + email verification required)
		merchants := v1.Group("/merchants/me")
		merchants.Use(middleware.AuthMiddleware())
		merchants.Use(middleware.EmailVerificationMiddleware(userRepo))
		{
			// Profile management
			merchants.POST("/profile", merchantHandler.CreateProfile)
			merchants.GET("/profile", merchantHandler.GetProfile)
			merchants.PUT("/profile", merchantHandler.UpdateProfile)
			merchants.POST("/logo", merchantHandler.UploadLogo)

			// Settings management
			merchants.GET("/settings", merchantHandler.GetSettings)
			merchants.PUT("/settings", merchantHandler.UpdateSettings)

			// Subscription management
			merchants.GET("/subscription", merchantHandler.GetSubscription)
			merchants.POST("/subscription/cancel", merchantHandler.CancelSubscription)

			// Quota management
			merchants.GET("/quota", merchantHandler.GetQuota)
		}

		// Alternative protected routes (removed duplicate /me endpoint)
		altProtected := v1.Group("")
		altProtected.Use(middleware.AuthMiddleware())
		{
			// Additional protected endpoints can be added here
		}

		// Slip verification routes (protected + email verification required)
		slips := v1.Group("/slips")
		slips.Use(middleware.AuthMiddleware())
		slips.Use(middleware.EmailVerificationMiddleware(userRepo))
		{
			slips.POST("/upload", slipHandler.UploadSlip)
			slips.POST("/scan", slipHandler.ScanQRData)
			slips.GET("/:slip_id", slipHandler.GetSlip)
			slips.POST("/:slip_id/reprocess", slipHandler.ReprocessSlip)
			slips.GET("", slipHandler.ListSlips)
		}

		// LINE webhook routes (public - called by LINE Platform)
		if lineWebhookHandler != nil {
			v1.POST("/line/webhook", lineWebhookHandler.HandleWebhook)
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
