ALTER TABLE "products" ADD COLUMN "editorial_category_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "editorial_family_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "editorial_brand_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_editorial_category_id_categories_id_fk" FOREIGN KEY ("editorial_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_editorial_family_id_families_id_fk" FOREIGN KEY ("editorial_family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_editorial_brand_id_brands_id_fk" FOREIGN KEY ("editorial_brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;