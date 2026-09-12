ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_movements_idempotency_unique" ON "inventory_movements" ("idempotency_key");
