package models

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestTransactionJSONHidesValidationProvider(t *testing.T) {
	transaction := Transaction{
		Provider:               "haveslip",
		ProviderVerificationID: "provider-id",
		ProviderStatus:         "success",
		ProviderValid:          true,
		ProviderCached:         true,
		ProviderChargedCredits: 1,
		ProviderResponse:       json.RawMessage(`{"source":"HaveSLIP"}`),
		SenderBank:             "SCB",
		ReceiverBank:           "KBank",
	}

	data, err := json.Marshal(transaction)
	if err != nil {
		t.Fatal(err)
	}

	for _, hidden := range []string{"haveslip", "provider", "provider-id"} {
		if strings.Contains(strings.ToLower(string(data)), hidden) {
			t.Errorf("transaction JSON exposed %q: %s", hidden, data)
		}
	}
	for _, visible := range []string{`"sender_bank":"SCB"`, `"receiver_bank":"KBank"`} {
		if !strings.Contains(string(data), visible) {
			t.Errorf("transaction JSON missing %q: %s", visible, data)
		}
	}
}
