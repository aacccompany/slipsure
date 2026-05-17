# Email Verification Setup Guide

## Overview
The authentication system now sends real emails for:
- **Email Verification** - OTP sent when users register
- **Password Reset** - OTP sent when users forget their password

## Quick Setup (Gmail Example)

### 1. Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification"

### 2. Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Click "Generate"
4. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### 3. Configure Environment Variables
Create a `.env` file in the backend directory:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
FROM_EMAIL=noreply@slipsure.com
FROM_NAME=SlipSure
```

## Alternative SMTP Providers

### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY
```

### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=YOUR_MAILGUN_USERNAME
SMTP_PASSWORD=YOUR_MAILGUN_PASSWORD
```

### Amazon SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=YOUR_SES_SMTP_USERNAME
SMTP_PASSWORD=YOUR_SES_SMTP_PASSWORD
```

## Testing Without SMTP

If you don't configure SMTP, the system will:
- Log OTP codes to console instead of sending emails
- Continue to work normally for development/testing
- Show warnings in logs: `⚠️ SMTP not configured, logging OTP instead`

Example console output:
```
📧 TODO: Send OTP 123456 to email user@example.com
```

## Email Templates

The system includes professional HTML email templates for:

### OTP Verification Email
- Beautiful gradient header
- Large, prominent OTP code
- 15-minute expiry notice
- Professional branding

### Password Reset Email
- Different color scheme (pink gradient)
- Clear security notice
- Same professional design

## Security Features

1. **TLS Encryption** - All emails sent over secure TLS connection
2. **15-Minute Expiry** - OTP codes expire automatically
3. **Rate Limiting Ready** - Easy to add rate limiting
4. **Professional From Addresses** - Configurable sender info

## Production Checklist

- [ ] Use real SMTP credentials (not Gmail personal account)
- [ ] Set `ENV=production` in environment
- [ ] Use strong JWT secret (min 32 characters)
- [ ] Configure `FROM_EMAIL` with your domain
- [ ] Test email delivery to spam folders
- [ ] Set up email analytics (optional)
- [ ] Configure DKIM/SPF records for your domain

## Troubleshooting

### Emails Not Arriving
1. Check spam/junk folders
2. Verify SMTP credentials are correct
3. Check firewall allows SMTP port (587)
4. Ensure "Less Secure Apps" is enabled (Gmail) or use App Password

### Authentication Errors
1. Verify username/password
2. For Gmail, use App Password (not regular password)
3. Check SMTP host and port are correct

### TLS Errors
1. Ensure SMTP server supports STARTTLS
2. Try port 465 (SSL) instead of 587 (TLS)

## Email Flow Examples

### Registration Flow
1. User registers → `POST /v1/auth/register`
2. System generates 6-digit OTP
3. Email sent with verification code
4. User verifies → `POST /v1/auth/verify-otp`
5. Account activated, JWT token returned

### Password Reset Flow
1. User requests reset → `POST /v1/auth/forgot-password`
2. System generates new OTP
3. Password reset email sent
4. User resets password → `POST /v1/auth/reset-password`
5. Password updated, user can login

## Next Steps

For production deployment, consider:
- Transactional email services (SendGrid, Mailgun)
- Email queue system for high volume
- Email analytics and tracking
- SMS OTP as backup option
- Multi-language email templates