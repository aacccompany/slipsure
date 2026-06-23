package models

import (
	"testing"
	"time"
)

func TestQuotaPeriodForSubscriptionAnniversary(t *testing.T) {
	location := time.FixedZone("Asia/Bangkok", 7*60*60)
	startedAt := time.Date(2026, time.June, 22, 11, 30, 0, 0, location)
	now := time.Date(2026, time.July, 5, 9, 0, 0, 0, location)

	periodStart, resetDate := QuotaPeriodFor(startedAt, now)

	expectedStart := time.Date(2026, time.June, 22, 11, 30, 0, 0, location)
	expectedReset := time.Date(2026, time.July, 22, 11, 30, 0, 0, location)
	if !periodStart.Equal(expectedStart) || !resetDate.Equal(expectedReset) {
		t.Fatalf("unexpected quota period: %s - %s", periodStart, resetDate)
	}
}

func TestQuotaPeriodForMonthEndSubscription(t *testing.T) {
	startedAt := time.Date(2026, time.January, 31, 10, 0, 0, 0, time.UTC)
	now := time.Date(2026, time.February, 28, 12, 0, 0, 0, time.UTC)

	periodStart, resetDate := QuotaPeriodFor(startedAt, now)

	if periodStart.Day() != 28 || periodStart.Month() != time.February {
		t.Fatalf("unexpected month-end period start: %s", periodStart)
	}
	if resetDate.Day() != 31 || resetDate.Month() != time.March {
		t.Fatalf("unexpected month-end reset date: %s", resetDate)
	}
}
