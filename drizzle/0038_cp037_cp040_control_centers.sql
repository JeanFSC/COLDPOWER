ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contact_preference" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "canonical_customer_id" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "merge_reason" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "merged_by" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "merged_at" timestamp with time zone;
CREATE INDEX IF NOT EXISTS "customers_canonical_idx" ON "customers" ("canonical_customer_id");
DO $$ BEGIN
  ALTER TABLE "customers" ADD CONSTRAINT "customers_canonical_customer_id_customers_id_fk" FOREIGN KEY ("canonical_customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "customer_contacts" ADD COLUMN IF NOT EXISTS "whatsapp" text;
ALTER TABLE "customer_contacts" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "channel" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_issued_at" timestamp with time zone;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "invoice_note" text;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "cost_snapshot" numeric(14,2);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "received_by" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "picked_quantity" integer NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "picked_at" timestamp with time zone;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "picked_by" text;
DO $$ BEGIN
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_picked_quantity_valid" CHECK ("picked_quantity" >= 0 AND "picked_quantity" <= "quantity");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN CREATE TYPE "public"."order_incident_type" AS ENUM('PHYSICAL_SHORTAGE','DAMAGED_PRODUCT','STOCK_MISMATCH','WRONG_PRODUCT','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."order_incident_status" AS ENUM('OPEN','RESOLVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "order_incidents" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL,
  "order_item_id" text,
  "type" "order_incident_type" NOT NULL,
  "note" text NOT NULL,
  "status" "order_incident_status" DEFAULT 'OPEN' NOT NULL,
  "blocker" boolean DEFAULT false NOT NULL,
  "created_by" text,
  "resolved_by" text,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN ALTER TABLE "order_incidents" ADD CONSTRAINT "order_incidents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "order_incidents" ADD CONSTRAINT "order_incidents_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "order_incidents_order_idx" ON "order_incidents" ("order_id", "status");
CREATE INDEX IF NOT EXISTS "order_incidents_item_idx" ON "order_incidents" ("order_item_id");

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_unique" ON "payments" ("idempotency_key");
