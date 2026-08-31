CREATE TYPE "public"."purchase_status" AS ENUM('DRAFT', 'PENDING', 'PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."purchase_receipt_status" AS ENUM('POSTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "import_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text,
	"commercial_invoice" text,
	"packing_list" text,
	"origin_country" varchar(2),
	"currency" varchar(3),
	"fob" numeric(14, 2),
	"freight" numeric(14, 2),
	"insurance" numeric(14, 2),
	"customs" numeric(14, 2),
	"taxes" numeric(14, 2),
	"other_costs" numeric(14, 2),
	"landed_cost" numeric(14, 2),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"product_id" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"quantity_ordered" integer NOT NULL,
	"quantity_received" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(14, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_items_ordered_positive" CHECK (quantity_ordered > 0),
	CONSTRAINT "purchase_items_received_nonnegative" CHECK (quantity_received >= 0 AND quantity_received <= quantity_ordered)
);
--> statement-breakpoint
CREATE TABLE "purchase_receipt_items" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_id" text NOT NULL,
	"purchase_item_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost" numeric(14, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	CONSTRAINT "purchase_receipt_items_quantity_positive" CHECK (quantity > 0)
);
--> statement-breakpoint
CREATE TABLE "purchase_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"purchase_id" text NOT NULL,
	"location_id" text NOT NULL,
	"status" "purchase_receipt_status" DEFAULT 'POSTED' NOT NULL,
	"received_by" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"supplier_id" text NOT NULL,
	"location_id" text NOT NULL,
	"status" "purchase_status" DEFAULT 'DRAFT' NOT NULL,
	"currency" varchar(3) NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"identification" text,
	"country" varchar(2) NOT NULL,
	"contact_name" text,
	"whatsapp" text,
	"email" text,
	"address" text,
	"currency" varchar(3) NOT NULL,
	"notes" text,
	"status" "supplier_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_documents" ADD CONSTRAINT "import_documents_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_receipt_id_purchase_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."purchase_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_item_id_purchase_items_id_fk" FOREIGN KEY ("purchase_item_id") REFERENCES "public"."purchase_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_items_purchase_product_unique" ON "purchase_items" USING btree ("purchase_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_receipt_items_product_unique" ON "purchase_receipt_items" USING btree ("receipt_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_receipts_code_unique" ON "purchase_receipts" USING btree ("code");--> statement-breakpoint
CREATE INDEX "purchase_receipts_purchase_idx" ON "purchase_receipts" USING btree ("purchase_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_code_unique" ON "purchases" USING btree ("code");--> statement-breakpoint
CREATE INDEX "purchases_supplier_idx" ON "purchases" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchases_status_idx" ON "purchases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "suppliers_name_idx" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "suppliers_identification_idx" ON "suppliers" USING btree ("identification");--> statement-breakpoint
CREATE INDEX "suppliers_status_idx" ON "suppliers" USING btree ("status");