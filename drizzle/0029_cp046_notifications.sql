ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "dedupe_key" text;
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_recipient_dedupe_unique" ON "notifications" ("recipient_id", "dedupe_key");
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "user_id" text PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "preferences" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
