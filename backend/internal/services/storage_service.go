package services

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
)

// StorageService handles file storage operations (DigitalOcean Spaces)
type StorageService struct {
	s3Client     *s3.S3
	bucket       string
	region       string
	endpoint     string
	publicDomain string
}

// NewStorageService creates a new DigitalOcean Spaces storage service
func NewStorageService() (*StorageService, error) {
	// Get configuration from environment
	spaceName := os.Getenv("SPACES_BUCKET")
	region := os.Getenv("SPACES_REGION")
	accessKey := os.Getenv("SPACES_ACCESS_KEY")
	secretKey := os.Getenv("SPACES_SECRET_KEY")

	if spaceName == "" || region == "" || accessKey == "" || secretKey == "" {
		return nil, fmt.Errorf("missing DigitalOcean Spaces credentials")
	}

	// Create AWS session with DigitalOcean Spaces endpoint
	endpoint := fmt.Sprintf("https://%s.digitaloceanspaces.com", region)

	config := &aws.Config{
		Credentials:      credentials.NewStaticCredentials(accessKey, secretKey, ""),
		Endpoint:         aws.String(endpoint),
		Region:           aws.String(region),
		S3ForcePathStyle: aws.Bool(true), // Use path style for DigitalOcean Spaces
	}

	sess, err := session.NewSession(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create AWS session: %w", err)
	}

	publicDomain := fmt.Sprintf("%s.%s.digitaloceanspaces.com", spaceName, region)

	log.Printf("Storage service initialized: bucket=%s, region=%s, endpoint=%s", spaceName, region, endpoint)

	return &StorageService{
		s3Client:     s3.New(sess),
		bucket:       spaceName,
		region:       region,
		endpoint:     endpoint,
		publicDomain: publicDomain,
	}, nil
}

// UploadImage uploads an image to DigitalOcean Spaces
func (s *StorageService) UploadImage(imageData []byte, filename, contentType string) (string, error) {
	// Generate unique filename with timestamp
	timestamp := time.Now().Format("20060102-150405")
	ext := filepath.Ext(filename)
	uniqueFilename := fmt.Sprintf("slips/%s-%s%s", timestamp, generateRandomString(8), ext)

	log.Printf("Uploading image to Spaces: %s (size: %d bytes, type: %s)", uniqueFilename, len(imageData), contentType)

	// Upload to Spaces
	_, err := s.s3Client.PutObject(&s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(uniqueFilename),
		Body:        bytes.NewReader(imageData),
		ContentType: aws.String(contentType),
		ACL:         aws.String("public-read"), // Make publicly accessible
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload to Spaces: %w", err)
	}

	// Generate public URL
	publicURL := fmt.Sprintf("https://%s/%s", s.publicDomain, uniqueFilename)
	log.Printf("Successfully uploaded to Spaces: %s", publicURL)

	return publicURL, nil
}

// UploadSlipImage uploads a slip image with proper naming
func (s *StorageService) UploadSlipImage(imageData []byte, slipID string, contentType string) (string, error) {
	// Generate filename with slip ID and timestamp
	timestamp := time.Now().Format("20060102-150405")
	ext := ".jpg" // Default extension
	if contentType == "image/png" {
		ext = ".png"
	}

	filename := fmt.Sprintf("slips/%s/%s-%s%s", slipID, timestamp, generateRandomString(4), ext)

	log.Printf("Uploading slip image: %s (size: %d bytes, type: %s)", filename, len(imageData), contentType)

	// Upload to Spaces
	_, err := s.s3Client.PutObject(&s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(filename),
		Body:        bytes.NewReader(imageData),
		ContentType: aws.String(contentType),
		ACL:         aws.String("public-read"),
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload slip to Spaces: %w", err)
	}

	// Generate public URL
	publicURL := fmt.Sprintf("https://%s/%s", s.publicDomain, filename)
	log.Printf("Successfully uploaded slip to Spaces: %s", publicURL)

	return publicURL, nil
}

// DownloadImage downloads an image from URL
func (s *StorageService) DownloadImage(url string) ([]byte, string, error) {
	// For now, use HTTP client to download
	// TODO: Could use S3 client if URL is from our Spaces
	client := &http.Client{}

	resp, err := client.Get(url)
	if err != nil {
		return nil, "", fmt.Errorf("failed to download image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, "", fmt.Errorf("failed to download image, status: %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read image data: %w", err)
	}

	contentType := resp.Header.Get("Content-Type")

	return data, contentType, nil
}

// DeleteFile deletes a file from Spaces
func (s *StorageService) DeleteFile(key string) error {
	log.Printf("Deleting file from Spaces: %s", key)

	_, err := s.s3Client.DeleteObject(&s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})

	if err != nil {
		return fmt.Errorf("failed to delete file from Spaces: %w", err)
	}

	log.Printf("Successfully deleted file from Spaces: %s", key)
	return nil
}

// generateRandomString generates a random string for unique filenames
func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}
