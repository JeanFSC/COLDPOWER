ALTER TABLE "order_status_history" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
CREATE UNIQUE INDEX IF NOT EXISTS "order_status_history_idempotency_unique" ON "order_status_history" ("idempotency_key");
