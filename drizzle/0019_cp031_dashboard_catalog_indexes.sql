CREATE INDEX "media_usages_entity_slot_idx" ON "media_asset_usages" USING btree ("entity_type","entity_id","slot","sort_order");--> statement-breakpoint
CREATE INDEX "products_editorial_taxonomy_idx" ON "products" USING btree ("editorial_category_id","editorial_family_id","editorial_brand_id");--> statement-breakpoint
CREATE INDEX "products_review_confidence_idx" ON "products" USING btree ("requires_review","normalization_confidence");--> statement-breakpoint
CREATE INDEX "quotes_created_at_idx" ON "quotes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "quotes_workflow_status_idx" ON "quotes" USING btree ("workflow_status");--> statement-breakpoint
CREATE INDEX "opportunities_created_at_idx" ON "opportunities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sales_created_at_idx" ON "sales" USING btree ("created_at");