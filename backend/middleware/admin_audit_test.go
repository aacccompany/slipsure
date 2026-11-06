package middleware

import "testing"

func TestAdminActionTracksMutationsExportsAndSensitiveReads(t *testing.T) {
	for _, tc := range []struct{ method, path, action string }{
		{"PATCH", "/v1/admin/users/:id/status", "UPDATE_USER_STATUS"},
		{"PUT", "/v1/admin/merchants/:id/quota", "ADJUST_MERCHANT_QUOTA"},
		{"GET", "/v1/admin/users/export", "EXPORT_USERS"},
		{"GET", "/v1/admin/logs/:id", "VIEW_AUDIT_DETAIL"},
	} {
		definition, ok := adminAction(tc.method, tc.path)
		if !ok || definition.action != tc.action {
			t.Fatalf("%s %s: got %+v, tracked %t", tc.method, tc.path, definition, ok)
		}
	}
	if _, tracked := adminAction("GET", "/v1/admin/merchants"); tracked {
		t.Fatal("ordinary list reads should not flood the audit log")
	}
}
