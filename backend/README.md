# SlipSure Backend API

Go backend service for slip verification SaaS platform.

## 🚀 Getting Started

### Prerequisites
- Go 1.21+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Local Development

1. **Install dependencies:**
   ```bash
   go mod download
   ```

2. **Set up environment:**
   ```bash
   cp ../.env.example ../.env
   # Edit .env with your configuration
   ```

3. **Run the server:**
   ```bash
   go run main.go
   ```

### Docker Development

1. **Build and start all services:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f backend
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

## 📁 Project Structure

```
backend/
├── main.go                 # Entry point with route definitions
├── go.mod                  # Go module dependencies
├── go.sum                  # Dependency checksums
├── Dockerfile              # Container build definition
├── configs/                # Configuration files
├── handlers/               # HTTP request handlers
├── models/                 # Data models and schemas
├── services/               # Business logic
├── middleware/             # Auth, logging, etc.
├── utils/                  # Helper functions
└── uploads/                # Temporary file storage
```

## 🔧 API Modules

1. **Authentication** - JWT auth, LINE Login
2. **Merchant Management** - Subscriptions, profiles
3. **Slip Verification** - QR processing, validation
4. **Transactions** - History, exports
5. **LINE Integration** - Webhooks, notifications
6. **Admin Dashboard** - Monitoring, analytics

## 📝 Environment Variables

See `../.env.example` for all required configuration variables.

## 🔐 LINE Integration

- **LINE Messaging API**: For receiving slip images via LINE Bot
- **LINE Login**: For user authentication
- Separate channel credentials required for each service

## 🧪 Testing

```bash
# Run tests
go test ./...

# Run with coverage
go test -cover ./...
```

## 🏗️ Build for Production

```bash
# Build binary
go build -o slipsure-api main.go

# Run binary
./slipsure-api
```

## 📊 API Documentation

See `api-spec-and-db-schema.md` for detailed API specification.