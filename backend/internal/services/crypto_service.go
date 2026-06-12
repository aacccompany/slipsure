package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"os"
)

// CryptoService handles encryption and decryption of sensitive data
type CryptoService struct {
	encryptionKey []byte
}

// NewCryptoService creates a new crypto service
func NewCryptoService() (*CryptoService, error) {
	key := os.Getenv("ENCRYPTION_MASTER_KEY")
	if key == "" {
		return nil, errors.New("ENCRYPTION_MASTER_KEY environment variable not set")
	}

	// The key should be 32 bytes for AES-256
	keyBytes := []byte(key)
	if len(keyBytes) != 32 {
		return nil, errors.New("ENCRYPTION_MASTER_KEY must be 32 bytes for AES-256")
	}

	return &CryptoService{
		encryptionKey: keyBytes,
	}, nil
}

// Encrypt encrypts plaintext using AES-256-GCM
func (c *CryptoService) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	// Create cipher block
	block, err := aes.NewCipher(c.encryptionKey)
	if err != nil {
		return "", err
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Generate nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// Encrypt and authenticate
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	// Encode to base64 for storage
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts ciphertext using AES-256-GCM
func (c *CryptoService) Decrypt(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	// Decode from base64
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	// Create cipher block
	block, err := aes.NewCipher(c.encryptionKey)
	if err != nil {
		return "", err
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Extract nonce
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]

	// Decrypt and verify
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// SecureClear clears sensitive data from memory
func (c *CryptoService) SecureClear(data *[]byte) {
	if data != nil && len(*data) > 0 {
		for i := range *data {
			(*data)[i] = 0
		}
		*data = nil
	}
}
