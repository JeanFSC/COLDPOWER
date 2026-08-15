ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "approval_status" text NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "approved_at" timestamptz;
CREATE INDEX IF NOT EXISTS "promotions_approval_status_idx" ON "promotions" ("approval_status");
