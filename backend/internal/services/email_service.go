package services

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/smtp"
	"os"
)

// EmailService defines the interface for email operations
type EmailService interface {
	SendOTPEmail(email, otp string) error
	SendPasswordResetEmail(email, otp string) error
}

// emailService implements EmailService interface
type emailService struct {
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPassword string
	fromEmail    string
	fromName     string
}

// NewEmailService creates a new email service instance
func NewEmailService() EmailService {
	return &emailService{
		smtpHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		smtpPort:     getEnv("SMTP_PORT", "587"),
		smtpUser:     getEnv("SMTP_USER", ""),
		smtpPassword: getEnv("SMTP_PASSWORD", ""),
		fromEmail:    getEnv("FROM_EMAIL", "noreply@slipsure.com"),
		fromName:     getEnv("FROM_NAME", "SlipSure"),
	}
}

// SendOTPEmail sends OTP verification email
func (s *emailService) SendOTPEmail(email, otp string) error {
	if s.smtpUser == "" || s.smtpPassword == "" {
		log.Printf("  SMTP not configured, logging OTP instead: %s for %s", otp, email)
		return nil // Don't fail registration if email isn't configured
	}

	subject := "Verify Your Email Address"
	body := s.buildOTPEmailBody(otp)

	err := s.sendEmail(email, subject, body)
	if err != nil {
		log.Printf("Failed to send OTP email to %s: %v", email, err)
		return err
	}

	log.Printf(" OTP email sent to %s", email)
	return nil
}

// SendPasswordResetEmail sends password reset email
func (s *emailService) SendPasswordResetEmail(email, otp string) error {
	if s.smtpUser == "" || s.smtpPassword == "" {
		log.Printf("  SMTP not configured, logging password reset OTP instead: %s for %s", otp, email)
		return nil
	}

	subject := "Reset Your Password"
	body := s.buildPasswordResetEmailBody(otp)

	err := s.sendEmail(email, subject, body)
	if err != nil {
		log.Printf("Failed to send password reset email to %s: %v", email, err)
		return err
	}

	log.Printf("✅ Password reset email sent to %s", email)
	return nil
}

// sendEmail sends an email using SMTP
func (s *emailService) sendEmail(to, subject, htmlBody string) error {
	// Create SMTP auth
	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPassword, s.smtpHost)

	// Build email message
	message := fmt.Sprintf("From: %s <%s>\r\n", s.fromName, s.fromEmail)
	message += fmt.Sprintf("To: %s\r\n", to)
	message += fmt.Sprintf("Subject: %s\r\n", subject)
	message += "MIME-version: 1.0;\r\n"
	message += "Content-Type: text/html; charset=\"UTF-8\";\r\n"
	message += "\r\n"
	message += htmlBody

	// Connect to SMTP server
	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)

	// Use TLS for secure connection
	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer client.Close()

	// Start TLS if supported
	if ok, _ := client.Extension("STARTTLS"); ok {
		config := &tls.Config{
			ServerName: s.smtpHost,
		}
		if err = client.StartTLS(config); err != nil {
			return fmt.Errorf("failed to start TLS: %w", err)
		}
	}

	// Authenticate
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("failed to authenticate: %w", err)
	}

	// Set sender and recipient
	if err = client.Mail(s.fromEmail); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	if err = client.Rcpt(to); err != nil {
		return fmt.Errorf("failed to set recipient: %w", err)
	}

	// Send email body
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}

	_, err = writer.Write([]byte(message))
	if err != nil {
		return fmt.Errorf("failed to write message: %w", err)
	}

	err = writer.Close()
	if err != nil {
		return fmt.Errorf("failed to close writer: %w", err)
	}

	// Quit SMTP session
	err = client.Quit()
	if err != nil {
		return fmt.Errorf("failed to quit: %w", err)
	}

	return nil
}

// buildOTPEmailBody creates HTML email body for OTP
func (s *emailService) buildOTPEmailBody(otp string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px; color: #667eea; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1> Verify Your Email</h1>
        </div>
        <div class="content">
            <h2>Welcome to SlipSure!</h2>
            <p>Thank you for registering with us. To complete your registration, please verify your email address using the OTP code below:</p>

            <div class="otp">%s</div>

            <p><strong>This OTP will expire in 15 minutes.</strong></p>
            <p>If you didn't create an account with SlipSure, please ignore this email.</p>

            <div class="footer">
                <p>Need help? Contact us at support@slipsure.com</p>
                <p>© 2026 SlipSure. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, otp)
}

// buildPasswordResetEmailBody creates HTML email body for password reset
func (s *emailService) buildPasswordResetEmailBody(otp string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%%, #f5576c 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp { background: white; border: 2px dashed #f5576c; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px; color: #f5576c; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔑 Reset Your Password</h1>
        </div>
        <div class="content">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Use the OTP code below to reset your password:</p>

            <div class="otp">%s</div>

            <p><strong>This OTP will expire in 15 minutes.</strong></p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>

            <div class="footer">
                <p>Need help? Contact us at support@slipsure.com</p>
                <p>© 2026 SlipSure. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, otp)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
