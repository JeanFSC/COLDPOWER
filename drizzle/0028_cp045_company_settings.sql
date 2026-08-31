ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "validation_status" text NOT NULL DEFAULT 'VALID';
CREATE INDEX IF NOT EXISTS "company_settings_validation_idx" ON "company_settings" ("validation_status");
CREATE TABLE IF NOT EXISTS "company_settings_history" (
  "id" text PRIMARY KEY,
  "settings_id" text NOT NULL,
  "version" integer NOT NULL,
  "actor_id" text,
  "actor_role" text,
  "before" jsonb,
  "after" jsonb NOT NULL,
  "validation_status" text NOT NULL DEFAULT 'VALID',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "company_settings_history_version_unique" UNIQUE ("settings_id", "version")
);
CREATE INDEX IF NOT EXISTS "company_settings_history_created_idx" ON "company_settings_history" ("settings_id", "created_at");
