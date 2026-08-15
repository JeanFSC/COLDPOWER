ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "priority" integer NOT NULL DEFAULT 0;
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "policy" text NOT NULL DEFAULT 'EXCLUSIVE';
ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "updated_by" text;
CREATE INDEX IF NOT EXISTS "promotions_priority_idx" ON "promotions" ("priority", "starts_at");
CREATE TABLE IF NOT EXISTS "promotion_applications" (
  "id" text PRIMARY KEY,
  "idempotency_key" text NOT NULL UNIQUE,
  "promotion_id" text NOT NULL REFERENCES "promotions"("id") ON DELETE RESTRICT,
  "product_id" text NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
  "context_type" text NOT NULL,
  "context_id" text NOT NULL,
  "base_unit_price" numeric(12,2) NOT NULL,
  "discount_amount" numeric(12,2) NOT NULL,
  "final_unit_price" numeric(12,2) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "promotion_applications_context_idx" ON "promotion_applications" ("context_type", "context_id");
CREATE INDEX IF NOT EXISTS "promotion_applications_promotion_idx" ON "promotion_applications" ("promotion_id");
