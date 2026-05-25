package main

import (
	"encoding/json"
	"fmt"
	"log"

	"slipsure-backend/internal/services"
)

func main() {
	// Test LINE webhook event structure
	testEvent := services.LINEWebhookEvent{
		Destination: "U1234567890",
		Events: []services.LINEEvent{
			{
				Type:       "message",
				ReplyToken: "test-reply-token",
				Timestamp:  1234567890,
				Source: services.LINEEventSource{
					Type:   "user",
					UserID: "Utestuser",
				},
				Message: &services.LINEMessageEvent{
					ID:   "1234567890",
					Type: "image",
				},
			},
		},
	}

	// Serialize to JSON to see structure
	jsonData, err := json.MarshalIndent(testEvent, "", "  ")
	if err != nil {
		log.Fatal("Error marshaling:", err)
	}

	fmt.Println("LINE Webhook Event Structure:")
	fmt.Println(string(jsonData))
}
