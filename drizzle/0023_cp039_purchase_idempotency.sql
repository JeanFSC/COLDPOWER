ALTER TABLE "purchases" ADD COLUMN "idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD COLUMN "idempotency_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_idempotency_unique" ON "purchases" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_receipts_idempotency_unique" ON "purchase_receipts" USING btree ("idempotency_key");
