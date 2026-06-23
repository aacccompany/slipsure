package services

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/jpeg" // Register JPEG decoder for LINE images
	_ "image/png"
	"log"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"slipsure-backend/internal/models"

	"github.com/disintegration/imaging"
	"github.com/makiuchi-d/gozxing"
	"github.com/makiuchi-d/gozxing/qrcode"
)

// QRScannerService handles QR code scanning and EMVCo data extraction
type QRScannerService struct{}

// NewQRScannerService creates a new QR scanner service
func NewQRScannerService() *QRScannerService {
	return &QRScannerService{}
}

// ExtractFromImage extracts QR data from an image file using gozxing
func (s *QRScannerService) ExtractFromImage(imagePath string) (string, error) {
	// Open the file
	file, err := os.Open(imagePath)
	if err != nil {
		return "", fmt.Errorf("failed to open image file: %w", err)
	}
	defer file.Close()

	// Decode image
	img, _, err := image.Decode(file)
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %w", err)
	}

	// Create binary bitmap from image
	bmp, err := gozxing.NewBinaryBitmapFromImage(img)
	if err != nil {
		return "", fmt.Errorf("failed to create bitmap: %w", err)
	}

	// Create QR code reader
	qrReader := qrcode.NewQRCodeReader()

	// Try to decode
	qrResult, err := qrReader.Decode(bmp, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decode QR from image: %w", err)
	}

	// Extract text from result
	if qrResult != nil {
		return qrResult.GetText(), nil
	}

	return "", fmt.Errorf("no QR data found")
}

// ExtractFromBytes extracts QR data from image bytes - simple approach
func (s *QRScannerService) ExtractFromBytes(imageData []byte) (string, error) {
	log.Printf("Attempting to extract QR from image (%d bytes)", len(imageData))

	// Simple approach: Try only the original image with gozxing
	qrData := s.tryDecodeQR(imageData, "original")
	if qrData != "" {
		log.Printf("Successfully extracted QR data from original image (length: %d)", len(qrData))
		log.Printf("QR CODE CONTENT: %s", qrData)
		return qrData, nil
	}

	log.Printf("QR decoding failed from original image")
	return "", fmt.Errorf("failed to extract QR from image")
}

// generateMockQRData creates mock QR data for testing purposes
// TODO: REMOVE THIS FUNCTION IN PRODUCTION
func (s *QRScannerService) generateMockQRData() string {
	// Generate realistic-looking Thai PromptPay QR data
	// Format: EMVCo with mock reference number and amount

	// Current timestamp for unique reference
	timestamp := time.Now().Format("20060102150405")
	refNumber := "REF" + timestamp + "1234567890"

	// Generate amount between 100-5000 THB
	amount := 100.0 + float64(time.Now().Unix()%4900)
	amountInSatang := int64(amount * 100)

	// Create EMVCo-style QR data with realistic data
	mockData := "000201" + // Payload Format (01)
		"010212" + // Point of Initiation Method (12 = static)
		"2916A000000677010112" + // Merchant Account Information (29 = ID, 16 = length)
		"0115A000000677010112" + // PromptPay ID
		"52045800" + // Merchant Category Code
		"5303764" + // Transaction Currency (THB)
		"54" + fmt.Sprintf("%012d", amountInSatang) + // Transaction Amount (12 digits)
		"5802TH" + // Country Code
		"6304AABB" // CRC

	log.Printf("Generated mock QR data for testing: %s, Amount: %.2f THB", refNumber, amount)
	return mockData
}

// tryDecodeQR attempts to decode QR code from image data using gozxing
func (s *QRScannerService) tryDecodeQR(imageData []byte, method string) string {
	// Add panic recovery to prevent crashes
	defer func() {
		if r := recover(); r != nil {
			log.Printf("QR decode panic recovered for %s method: %v", method, r)
		}
	}()

	// Decode image
	img, _, err := image.Decode(bytes.NewReader(imageData))
	if err != nil {
		log.Printf("Failed to decode image for %s method: %v", method, err)
		return ""
	}

	// Create binary bitmap from image
	bmp, err := gozxing.NewBinaryBitmapFromImage(img)
	if err != nil {
		log.Printf("Failed to create bitmap for %s method: %v", method, err)
		return ""
	}

	// Create QR code reader
	qrReader := qrcode.NewQRCodeReader()

	// Try to decode - gozxing.Decode() returns (*Result, error)
	qrResult, err := qrReader.Decode(bmp, nil)
	if err != nil {
		log.Printf("QR decode failed for %s method: %v", method, err)
		return ""
	}

	// Extract text from result
	if qrResult != nil && qrResult.GetText() != "" {
		qrText := qrResult.GetText()
		log.Printf("Successfully decoded QR using %s method (length: %d)", method, len(qrText))
		return qrText
	}

	return ""
}

// preprocessImage applies preprocessing to improve QR detection
func (s *QRScannerService) preprocessImage(imageData []byte) []byte {
	// Decode image
	img, _, err := image.Decode(bytes.NewReader(imageData))
	if err != nil {
		log.Printf("Failed to decode image for preprocessing: %v", err)
		return nil
	}

	log.Printf("Image decoded for preprocessing, bounds: %v", img.Bounds())

	// Apply preprocessing: grayscale + contrast
	processed := imaging.Grayscale(img)
	processed = imaging.AdjustContrast(processed, 20)
	processed = imaging.Sharpen(processed, 1.5)

	// Encode back to JPEG
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, processed, &jpeg.Options{Quality: 90})
	if err != nil {
		log.Printf("Failed to encode preprocessed image: %v", err)
		return nil
	}

	log.Printf("Image preprocessed successfully: %d bytes", buf.Len())
	return buf.Bytes()
}

// resizeImage resizes image to improve QR detection
func (s *QRScannerService) resizeImage(imageData []byte, maxWidth int) []byte {
	// Decode image
	img, _, err := image.Decode(bytes.NewReader(imageData))
	if err != nil {
		log.Printf("Failed to decode image for resizing: %v", err)
		return nil
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Only resize if smaller than maxWidth
	if width >= maxWidth {
		log.Printf("Image already large enough: %dx%d", width, height)
		return nil
	}

	// Calculate new height maintaining aspect ratio
	newHeight := (maxWidth * height) / width

	log.Printf("Resizing image from %dx%d to %dx%d", width, height, maxWidth, newHeight)

	// Resize image
	resized := imaging.Resize(img, maxWidth, newHeight, imaging.Lanczos)

	// Encode back to JPEG
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, resized, &jpeg.Options{Quality: 95})
	if err != nil {
		log.Printf("Failed to encode resized image: %v", err)
		return nil
	}

	log.Printf("Image resized successfully: %d bytes", buf.Len())
	return buf.Bytes()
}
func (s *QRScannerService) extractFromImagePatterns(imageData []byte) string {
	img, format, err := image.Decode(bytes.NewReader(imageData))
	if err != nil {
		log.Printf("Failed to decode image: %v", err)
		return ""
	}

	log.Printf("Image decoded: %s, bounds: %v", format, img.Bounds())
	return ""
}

// ParseEMVCoData parses EMVCo QR data into structured format
func (s *QRScannerService) ParseEMVCoData(qrData string) (*models.EMVCoData, error) {
	data := &models.EMVCoData{
		QRRawData: qrData,
	}

	// Remove whitespace
	qrData = strings.TrimSpace(qrData)

	// Check if it's a Thai bank-specific format first (like KBank, SCB, etc.)
	if s.isThaiBankFormat(qrData) {
		return s.parseThaiBankFormat(qrData)
	}

	// Check if it's a valid EMVCo QR string
	if !strings.HasPrefix(qrData, "0002") && !strings.HasPrefix(qrData, "01") {
		// Try to extract as Thai PromptPay format
		return s.parseThaiPromptPay(qrData)
	}

	// Parse ID-Length-Value format
	i := 0
	for i < len(qrData) {
		if i+4 > len(qrData) {
			break
		}

		// Extract ID (2 digits)
		id := qrData[i : i+2]
		i += 2

		// Extract Length (2 digits)
		length, err := strconv.ParseInt(qrData[i:i+2], 10, 64)
		if err != nil {
			break
		}
		i += 2

		// Extract Value
		if i+int(length) > len(qrData) {
			break
		}
		value := qrData[i : i+int(length)]
		i += int(length)

		log.Printf("EMVCo Tag: %s, Length: %d, Value: %s", id, length, value)

		// Map IDs to fields
		switch id {
		case "00": // Payload Format Indicator
			data.PayloadFormat = value
		case "01": // Point of Initiation Method
			data.PointOfInitiation = value
		case "29", "02": // Merchant Account Information
			data.MerchantAccountInfo = value
		case "53": // Transaction Currency
			data.TransactionCurrency = value
		case "54": // Transaction Amount
			if amount, err := strconv.ParseFloat(value, 64); err == nil {
				data.TransactionAmount = amount / 100.0 // Convert from satang to baht
			}
		case "58": // Merchant Category Code
			data.MerchantCategory = value
		case "62": // Bill Number
			// Try multiple subtags for bill number
			for _, tag := range []string{"07", "08", "01", "02"} {
				if billNum := s.extractTLV(value, tag); billNum != "" {
					data.BillNumber = billNum
					log.Printf("Found bill number from tag %s: %s", tag, billNum)
					break
				}
			}
			// Fallback: use entire value as bill number
			if data.BillNumber == "" && len(value) > 5 {
				data.BillNumber = value
				log.Printf("Using entire value as bill number: %s", value)
			}
		case "07": // Mobile Number (Thai PromptPay specific)
			data.MobileNumber = s.extractTLV(value, "01")
		case "59": // Merchant City/Name
			data.StoreLabel = value
		case "63": // Additional Data Field
			// Try multiple subtags for reference number
			for _, tag := range []string{"07", "08", "01", "02"} {
				if ref := s.extractTLV(value, tag); ref != "" {
					data.ReferenceNumber = ref
					log.Printf("Found reference number from tag %s: %s", tag, ref)
					break
				}
			}
		}
	}

	// Final fallback: If still no reference number, try to extract it from bill number
	if data.ReferenceNumber == "" && data.BillNumber != "" {
		data.ReferenceNumber = data.BillNumber
		log.Printf("Using bill number as reference: %s", data.BillNumber)
	}

	return data, nil
}

// parseThaiPromptPay parses Thai PromptPay specific format
func (s *QRScannerService) parseThaiPromptPay(qrData string) (*models.EMVCoData, error) {
	data := &models.EMVCoData{
		QRRawData: qrData,
	}

	refPattern := regexp.MustCompile(`(REF\d{10,30}|\d{16,19})`)
	if matches := refPattern.FindStringSubmatch(qrData); len(matches) > 0 {
		data.ReferenceNumber = matches[0]
		log.Printf("Extracted reference number: %s", data.ReferenceNumber)
	}

	amountPattern := regexp.MustCompile(`(\d+\.\d{2}|\d{4,10})`)
	if matches := amountPattern.FindStringSubmatch(qrData); len(matches) > 0 {
		if amount, err := strconv.ParseFloat(matches[0], 64); err == nil {
			// If it's a large number without decimal, convert from satang to baht
			if amount > 100000 && !strings.Contains(matches[0], ".") {
				data.TransactionAmount = amount / 100.0
			} else {
				data.TransactionAmount = amount
			}
			log.Printf("Extracted amount: %.2f THB", data.TransactionAmount)
		}
	}

	if strings.Contains(qrData, "=") || strings.Contains(qrData, ":") {
		pairs := strings.Split(qrData, "&")
		for _, pair := range pairs {
			kv := strings.SplitN(pair, "=", 2)
			if len(kv) == 2 {
				switch strings.ToLower(kv[0]) {
				case "ref", "reference", "refno":
					data.ReferenceNumber = kv[1]
				case "amount", "amt":
					if amount, err := strconv.ParseFloat(kv[1], 64); err == nil {
						data.TransactionAmount = amount
					}
				case "mobile", "phone":
					data.MobileNumber = kv[1]
				case "bill":
					data.BillNumber = kv[1]
				}
			}
		}
	}

	return data, nil
}

// extractTLV extracts Tag-Length-Value from sub-TLV data
func (s *QRScannerService) extractTLV(data, tag string) string {
	// Find tag in data
	tagIndex := strings.Index(data, tag)
	if tagIndex == -1 {
		return ""
	}

	// Skip tag and get length
	i := tagIndex + len(tag)
	if i+2 > len(data) {
		return ""
	}

	length, err := strconv.ParseInt(data[i:i+2], 10, 64)
	if err != nil {
		return ""
	}

	// Extract value
	i += 2
	if i+int(length) > len(data) {
		return ""
	}

	return data[i : i+int(length)]
}

// ValidateQRData checks if QR data is valid format
func (s *QRScannerService) ValidateQRData(qrData string) error {
	qrData = strings.TrimSpace(qrData)

	if len(qrData) < 10 {
		return fmt.Errorf("QR data too short")
	}

	// Check for common Thai slip patterns
	if !strings.Contains(qrData, "00") && !strings.Contains(qrData, "REF") {
		return fmt.Errorf("invalid QR format: missing required fields")
	}

	return nil
}

// isThaiBankFormat checks if QR data matches Thai bank-specific format
func (s *QRScannerService) isThaiBankFormat(qrData string) bool {
	// Thai bank QR format typically starts with specific patterns
	// Format: XXXX0006... (like KBank, SCB, BBL, etc.)
	if len(qrData) < 20 {
		return false
	}

	// Check for Thai bank signature patterns (first 4 digits + 0006)
	patterns := []string{
		"00380006", // KBank/Thai bank format
		"00380008", // Another Thai bank variant
		"00370006", // SCB format
		"00170006", // BBL format
		"00410006", // Another Thai bank variant (your pattern!)
		"00390006", // Additional Thai bank variant
		"00460006", // Additional Thai bank variant
	}

	// Check specific patterns first
	for _, pattern := range patterns {
		if strings.HasPrefix(qrData, pattern) {
			return true
		}
	}

	// General pattern: XXXX0006 (4 digits + 0006)
	if len(qrData) >= 8 {
		prefix := qrData[0:4]
		if qrData[4:8] == "0006" {
			fmt.Printf("Detected Thai bank format by pattern: %s0006\n", prefix)
			return true
		}
	}

	return false
}

// parseThaiBankFormat parses Thai bank-specific QR format
func (s *QRScannerService) parseThaiBankFormat(qrData string) (*models.EMVCoData, error) {
	data := &models.EMVCoData{
		QRRawData: qrData,
	}

	fmt.Printf("Parsing Thai bank QR format\n")
	fmt.Printf("QR Data Length: %d\n", len(qrData))
	fmt.Printf("Raw Data: %s\n\n", qrData)

	// Thai bank format structure:
	// 0038 (4 bytes) - Header
	// 0006 (4 bytes) - Type/Version
	// [Variable length timestamp/transaction data]
	// [Reference ID starts when first alphabetic character appears]
	// Reference ID continues until "5102" delimiter
	// 5102 (4 bytes) - Suffix/delimiter
	// TH... (remaining) - Serial/transaction data

	if len(qrData) < 20 {
		return data, fmt.Errorf("QR data too short for Thai bank format")
	}

	// Extract header info
	header := qrData[0:4]
	typeVersion := qrData[4:8]

	fmt.Printf("Header: %s\n", header)
	fmt.Printf("Type/Version: %s\n", typeVersion)

	// Find where the reference ID starts - based on pattern analysis
	// Thai bank format: reference ID starts at position 25 (after 25 bytes of header/data)
	refIDStart := 25

	// Validate we have enough data
	if refIDStart >= len(qrData) {
		return data, fmt.Errorf("QR data too short for reference ID extraction")
	}

	// Extract timestamp/data before reference ID
	timestamp := qrData[8:refIDStart]
	fmt.Printf("Transaction Data: %s\n", timestamp)

	// Find reference ID end - look for "5102" delimiter
	delimiter := "5102"
	refIDEnd := -1

	if refIDStart < len(qrData) {
		dataAfterRefStart := qrData[refIDStart:]
		if idx := strings.Index(dataAfterRefStart, delimiter); idx != -1 && idx > 0 {
			refIDEnd = refIDStart + idx
		}
	}

	// Extract reference ID
	if refIDEnd != -1 && refIDEnd > refIDStart {
		referenceID := qrData[refIDStart:refIDEnd]
		data.ReferenceNumber = referenceID

		fmt.Printf("\n*** THAI BANK FORMAT DETECTED ***\n")
		fmt.Printf("Reference ID: %s (%d characters)\n", referenceID, len(referenceID))

		// Extract suffix if available
		if refIDEnd+4 <= len(qrData) {
			suffix := qrData[refIDEnd : refIDEnd+4]
			fmt.Printf("Suffix: %s\n", suffix)

			// Extract serial if available
			if refIDEnd+4 < len(qrData) {
				serial := qrData[refIDEnd+4:]
				fmt.Printf("Serial: %s\n", serial)
			}
		}

		// Show structure breakdown
		fmt.Println("\nStructure Breakdown:")
		fmt.Printf("Positions 0-4 (Header):     [%s]\n", qrData[0:4])
		fmt.Printf("Positions 4-8 (Type):       [%s]\n", qrData[4:8])
		fmt.Printf("Positions 8-%d (Data):      [%s]\n", refIDStart, timestamp)
		fmt.Printf("Positions %d-%d (Ref ID):   [%s] ← REFERENCE\n", refIDStart, refIDEnd, referenceID)
		if refIDEnd+4 <= len(qrData) {
			fmt.Printf("Positions %d-%d (Suffix):   [%s]\n", refIDEnd, refIDEnd+4, qrData[refIDEnd:refIDEnd+4])
		}
		if refIDEnd+4 < len(qrData) {
			fmt.Printf("Positions %d-end (Serial): [%s]\n", refIDEnd+4, qrData[refIDEnd+4:])
		}

	} else {
		// Fallback: use everything from refIDStart as reference ID
		referenceID := qrData[refIDStart:]
		data.ReferenceNumber = referenceID

		fmt.Printf("Warning: Could not find delimiter '5102', using rest as reference\n")
		fmt.Printf("Reference ID: %s\n", referenceID)
	}

	// Try to extract amount if present
	amountPattern := regexp.MustCompile(`(\d{3,8})\d{2}`) // Look for amount-like patterns
	if matches := amountPattern.FindAllString(qrData, -1); len(matches) > 0 {
		// Try to find a reasonable amount (avoiding timestamps, etc.)
		for _, match := range matches {
			if amount, err := strconv.ParseFloat(match, 64); err == nil {
				// Convert from satang to baht if it looks like satang
				if amount > 100000 && amount < 10000000 { // Reasonable range: 1,000-100,000 THB
					data.TransactionAmount = amount / 100.0
					fmt.Printf("Extracted Amount: %.2f THB\n", data.TransactionAmount)
					break
				}
			}
		}
	}

	return data, nil
}
