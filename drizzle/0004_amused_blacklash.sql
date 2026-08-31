CREATE TABLE "brands" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_relations" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"related_product_id" text NOT NULL,
	"relation_type" text DEFAULT 'related' NOT NULL,
	"validated" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"slug" text NOT NULL,
	"original_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"product_type" text NOT NULL,
	"category_id" text NOT NULL,
	"family_id" text NOT NULL,
	"brand_id" text,
	"compatibility_brands" text[],
	"model_code" text,
	"application" text,
	"voltage" text,
	"power" text,
	"frequency" text,
	"rpm" text,
	"amperage" text,
	"capacitance" text,
	"refrigerant" text,
	"horsepower" text,
	"temperature" text,
	"dimensions" text,
	"length" text,
	"connection_size" text,
	"unit_of_measure" text,
	"status" text NOT NULL,
	"tax_type" text,
	"original_reference_code" text,
	"barcode" text,
	"original_weight" text,
	"requires_review" boolean,
	"review_reason" text,
	"possible_duplicate" boolean,
	"duplicate_group" text,
	"normalization_confidence" text,
	"normalization_method" text,
	"source_page" integer,
	"source_row" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"product_id" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "tracking_code" text;
--> statement-breakpoint
UPDATE "quotes" SET "tracking_code" = "id" WHERE "tracking_code" IS NULL;
--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "tracking_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug_unique" ON "brands" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "brands_name_unique" ON "brands" USING btree ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX "families_category_name_unique" ON "families" USING btree ("category_id","name");
--> statement-breakpoint
CREATE UNIQUE INDEX "families_slug_unique" ON "families" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "families_category_id_idx" ON "families" USING btree ("category_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "product_relations_pair_unique" ON "product_relations" USING btree ("product_id","related_product_id","relation_type");
--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_unique" ON "products" USING btree ("sku");
--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");
--> statement-breakpoint
CREATE INDEX "products_family_id_idx" ON "products" USING btree ("family_id");
--> statement-breakpoint
CREATE INDEX "products_brand_id_idx" ON "products" USING btree ("brand_id");
--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "products_source_page_row_idx" ON "products" USING btree ("source_page","source_row");
--> statement-breakpoint
CREATE UNIQUE INDEX "quote_items_quote_product_unique" ON "quote_items" USING btree ("quote_id","product_id");
--> statement-breakpoint
CREATE INDEX "quote_items_quote_id_idx" ON "quote_items" USING btree ("quote_id");
--> statement-breakpoint
CREATE INDEX "quote_items_product_id_idx" ON "quote_items" USING btree ("product_id");
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tracking_code_unique" UNIQUE("tracking_code");
