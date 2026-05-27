# ============================================
# Multi-stage Go Dockerfile for Slip Verification API
# ============================================

# Stage 1: Build
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Set Go proxy for better reliability
ENV GOPROXY=https://goproxy.cn,direct

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies (with retry logic)
RUN go mod download || \
    (echo "Retrying go mod download..." && go mod download)

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Stage 2: Runtime
FROM alpine:latest

# Install runtime dependencies for QR code processing
RUN apk --no-cache add ca-certificates tzdata zbar

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/main .

# Create runtime directories
RUN mkdir -p uploads configs logs

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
