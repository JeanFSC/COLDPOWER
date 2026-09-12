DO $$ BEGIN
  CREATE TYPE "quote_tax_mode" AS ENUM ('INCLUDED', 'EXCLUDED', 'UNCONFIGURED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "quote_version_status" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "quote_discount_approval_status" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "current_version_number" integer NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "revision" integer NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "accepted_version_id" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "accepted_at" timestamptz;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "accepted_by" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "assigned_seller_id" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "origin" text NOT NULL DEFAULT 'WEB';
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "currency" varchar(3);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "subtotal" numeric(14, 2);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(14, 2);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "total" numeric(14, 2);
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "tax_mode" "quote_tax_mode" NOT NULL DEFAULT 'UNCONFIGURED';
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discount_approval_status" "quote_discount_approval_status" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "valid_until" timestamptz;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "sent_at" timestamptz;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "sent_by" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "responded_at" timestamptz;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "responded_by" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "response_channel" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "response_note" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "acceptance_note" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "rejection_reason_code" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "cancelled_by" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz;
CREATE INDEX IF NOT EXISTS "quotes_valid_until_idx" ON "quotes" ("valid_until");
CREATE INDEX IF NOT EXISTS "quotes_assigned_seller_idx" ON "quotes" ("assigned_seller_id");
CREATE INDEX IF NOT EXISTS "quotes_accepted_version_idx" ON "quotes" ("accepted_version_id");
CREATE INDEX IF NOT EXISTS "quotes_origin_idx" ON "quotes" ("origin");

ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "base_unit_price" numeric(14, 2);
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "discount_percentage" numeric(5, 2);
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(14, 2);
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "final_unit_price" numeric(14, 2);
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "line_total" numeric(14, 2);
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "currency" varchar(3);
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "price_type" text;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "price_source_id" text;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "price_reason" text;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "discount_status" "quote_discount_approval_status" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "discount_reason" text;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS "quote_items_currency_idx" ON "quote_items" ("currency");

CREATE TABLE IF NOT EXISTS "quote_versions" (
  "id" text PRIMARY KEY,
  "quote_id" text NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
  "version_number" integer NOT NULL,
  "status" "quote_version_status" NOT NULL DEFAULT 'DRAFT',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" text,
  "sent_at" timestamptz,
  "sent_by" text,
  "currency" varchar(3),
  "subtotal" numeric(14, 2),
  "discount_amount" numeric(14, 2),
  "tax_amount" numeric(14, 2),
  "total" numeric(14, 2),
  "tax_mode" "quote_tax_mode" NOT NULL DEFAULT 'UNCONFIGURED',
  "valid_until" timestamptz,
  "terms_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "company_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "customer_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "content_hash" text,
  "accepted_at" timestamptz,
  "accepted_by" text,
  "accepted_channel" text,
  "acceptance_note" text
);
CREATE UNIQUE INDEX IF NOT EXISTS "quote_versions_quote_version_unique" ON "quote_versions" ("quote_id", "version_number");
CREATE INDEX IF NOT EXISTS "quote_versions_quote_idx" ON "quote_versions" ("quote_id", "created_at");
CREATE INDEX IF NOT EXISTS "quote_versions_status_idx" ON "quote_versions" ("status");

CREATE TABLE IF NOT EXISTS "quote_version_items" (
  "id" text PRIMARY KEY,
  "version_id" text NOT NULL REFERENCES "quote_versions"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
  "sku_snapshot" text NOT NULL,
  "product_name_snapshot" text NOT NULL,
  "quantity" integer NOT NULL,
  "base_unit_price" numeric(14, 2),
  "discount_percentage" numeric(5, 2),
  "discount_amount" numeric(14, 2),
  "final_unit_price" numeric(14, 2),
  "line_total" numeric(14, 2),
  "currency" varchar(3),
  "price_type" text,
  "price_source_id" text,
  "price_reason" text,
  "discount_status" "quote_discount_approval_status" NOT NULL DEFAULT 'NOT_REQUIRED',
  "discount_reason" text
);
CREATE UNIQUE INDEX IF NOT EXISTS "quote_version_items_version_product_unique" ON "quote_version_items" ("version_id", "product_id");
CREATE INDEX IF NOT EXISTS "quote_version_items_version_idx" ON "quote_version_items" ("version_id");
CREATE INDEX IF NOT EXISTS "quote_version_items_product_idx" ON "quote_version_items" ("product_id");

CREATE TABLE IF NOT EXISTS "quote_discount_approvals" (
  "id" text PRIMARY KEY,
  "quote_id" text NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
  "version_id" text REFERENCES "quote_versions"("id") ON DELETE SET NULL,
  "quote_item_id" text REFERENCES "quote_items"("id") ON DELETE SET NULL,
  "requested_by" text,
  "percentage" numeric(5, 2) NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "reason" text NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "approved_by" text,
  "approved_at" timestamptz,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "quote_discount_approvals_quote_idx" ON "quote_discount_approvals" ("quote_id", "created_at");
CREATE INDEX IF NOT EXISTS "quote_discount_approvals_status_idx" ON "quote_discount_approvals" ("status");
