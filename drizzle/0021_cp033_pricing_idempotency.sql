ALTER TABLE "product_prices" ADD COLUMN "idempotency_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "product_prices_idempotency_unique" ON "product_prices" USING btree ("idempotency_key");
