ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
CREATE UNIQUE INDEX IF NOT EXISTS "transfers_idempotency_unique" ON "transfers" ("idempotency_key");
