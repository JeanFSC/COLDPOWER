ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_sync_status" text NOT NULL DEFAULT 'SYNCED';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_sync_error" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_synced_at" timestamptz;
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" ("status");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role_code", "role");
CREATE TABLE IF NOT EXISTS "clerk_webhook_events" (
  "id" text PRIMARY KEY,
  "event_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "received_at" timestamptz NOT NULL DEFAULT now(),
  "processed_at" timestamptz,
  "error" text
);
CREATE INDEX IF NOT EXISTS "clerk_webhook_events_status_idx" ON "clerk_webhook_events" ("status");
CREATE INDEX IF NOT EXISTS "clerk_webhook_events_received_idx" ON "clerk_webhook_events" ("received_at");
