ALTER TABLE "discount_rules" ADD COLUMN "valid_from" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discount_rules" ADD COLUMN "valid_until" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "discount_rules_validity_idx" ON "discount_rules" USING btree ("valid_from","valid_until");--> statement-breakpoint
CREATE INDEX "price_history_actor_type_idx" ON "price_history" USING btree ("changed_by","price_type","created_at");