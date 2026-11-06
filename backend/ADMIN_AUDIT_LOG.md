# Admin audit log

`admin_audit_logs` is separate from operational `system_logs`, payment logs, and slip history. The backend creates it with the registered migration `20261106_add_admin_audit_logs.sql` on startup. Do not run the schema reset script against an existing database.

The application records admin password-login attempts, successful admin LINE logins, logout, denied admin access, user status changes, merchant quota and alert-recipient changes, sensitive detail views, and exports. Failed LINE callbacks cannot be linked to an admin identity without a verified LINE profile and are not recorded as admin login attempts. New admin mutation routes must be added to `middleware/admin_audit.go`. Only explicitly selected fields are read for before/after snapshots; never serialize whole user, merchant, or payment records.

Audit records are append-only. There is no application endpoint for modification or deletion, and a database trigger rejects updates and deletes. The operating retention policy is **at least 365 days**; archiving or lawful deletion after that period requires a privileged, reviewed database maintenance procedure. There is no automatic purge job.

Writes occur after the action's HTTP handler, outside its transaction. A failed audit insert is logged as `Admin audit write failed` and must be treated as an operational alert; it does not undo a completed mutation. Transactional audit writes are future work for mutation repositories that can share a database transaction.

`TRUSTED_PROXIES` accepts a comma-separated list of exact reverse-proxy IPs or CIDRs. Leave it unset to ignore forwarded IP headers. Configure it only for proxies under your control; never trust all clients. Audit exports contain personal data: restrict access to administrators and store downloaded CSV files securely.
