ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "result" text;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "occurred_at" timestamp with time zone;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "next_action" text;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "next_action_at" timestamp with time zone;
CREATE INDEX IF NOT EXISTS "crm_activities_occurred_idx" ON "crm_activities" ("occurred_at");
