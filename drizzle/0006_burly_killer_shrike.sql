CREATE TYPE "public"."duplicate_decision" AS ENUM('pending', 'different', 'confirmed', 'keep_both');--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "duplicate_decision" "duplicate_decision" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "canonical_product_id" text;--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "products_duplicate_group_idx" ON "products" USING btree ("duplicate_group");