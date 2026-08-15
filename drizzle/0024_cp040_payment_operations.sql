CREATE TABLE IF NOT EXISTS "payment_status_history" (
  "id" text PRIMARY KEY NOT NULL,
  "payment_id" text NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
  "from_status" "payment_status",
  "to_status" "payment_status" NOT NULL,
  "changed_by" text,
  "actor_role" text,
  "provider" text,
  "reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "payment_status_history_payment_idx" ON "payment_status_history" ("payment_id");
CREATE INDEX IF NOT EXISTS "payment_status_history_created_idx" ON "payment_status_history" ("created_at");

CREATE TABLE IF NOT EXISTS "payment_refunds" (
  "id" text PRIMARY KEY NOT NULL,
  "payment_id" text NOT NULL REFERENCES "payments"("id") ON DELETE RESTRICT,
  "provider" text,
  "provider_reference" text,
  "idempotency_key" text,
  "amount" numeric(14, 2) NOT NULL,
  "currency" varchar(3) NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "reason" text NOT NULL,
  "requested_by" text,
  "external_reference" text,
  "metadata" jsonb,
  "confirmed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "payment_refunds_payment_idx" ON "payment_refunds" ("payment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_refunds_provider_reference_unique" ON "payment_refunds" ("provider", "provider_reference");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_refunds_idempotency_unique" ON "payment_refunds" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "payment_refunds_status_idx" ON "payment_refunds" ("status");
