# Database migrations

The backend applies pending migrations during normal startup. Rebuild and start
the backend (`docker compose up -d --build backend`); do not run SQL files by hand.
The optional `./main migrate` command applies the same pending migrations and exits.

Applied filenames are stored in `schema_migrations`. Each migration and its
history entry commit together. Startup stops if a migration fails.

For a new change, add a forward-only SQL file under `migrations/` and register
its filename in the ordered `migrations` list in `migrate.go`. Do not edit an
already-applied migration. Historical reset scripts and superseded plan seeds
are deliberately not registered.

`schema.sql` initializes only an empty database. It must not be run directly on
an existing database because it contains `DROP TABLE` statements.
