CREATE TYPE "public"."app_role" AS ENUM('SUPERADMIN', 'JEFATURA', 'VENTAS', 'ALMACEN', 'COMPRAS', 'REPORTES');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('unknown', 'in_stock', 'low_stock', 'out_of_stock', 'on_request');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_type" AS ENUM('OPENING_BALANCE', 'PURCHASE_RECEIPT', 'SALE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'RETURN_IN', 'RETURN_OUT', 'RESERVATION', 'RESERVATION_RELEASE');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('STORE', 'WAREHOUSE', 'STORE_WAREHOUSE');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('draft', 'review', 'published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('ACTIVE', 'RELEASED', 'CONSUMED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('DRAFT', 'REQUESTED', 'APPROVED', 'PREPARED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"legal_name" text,
	"commercial_name" text,
	"ruc" text,
	"address" text,
	"phones" text[],
	"whatsapp" text,
	"email" text,
	"hours" text,
	"socials" jsonb,
	"locations" jsonb,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"location_id" text NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"minimum_stock" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_balances_non_negative" CHECK (on_hand >= 0 AND reserved >= 0),
	CONSTRAINT "inventory_balances_reserved_within_stock" CHECK (reserved <= on_hand)
);
--> statement-breakpoint
CREATE TABLE "inventory_import_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"filename" text,
	"rows_read" integer DEFAULT 0 NOT NULL,
	"matched" integer DEFAULT 0 NOT NULL,
	"unmatched" integer DEFAULT 0 NOT NULL,
	"ambiguous" integer DEFAULT 0 NOT NULL,
	"quantities" integer DEFAULT 0 NOT NULL,
	"locations" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"applied_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"location_id" text NOT NULL,
	"type" "inventory_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"previous_on_hand" integer NOT NULL,
	"resulting_on_hand" integer NOT NULL,
	"previous_reserved" integer NOT NULL,
	"resulting_reserved" integer NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"reason" text,
	"notes" text,
	"performed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_quantity_positive" CHECK (quantity > 0),
	CONSTRAINT "inventory_movements_resulting_non_negative" CHECK (resulting_on_hand >= 0 AND resulting_reserved >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"location_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"status" "reservation_status" DEFAULT 'ACTIVE' NOT NULL,
	"reference_type" text,
	"reference_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "inventory_reservations_quantity_positive" CHECK (quantity > 0)
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "location_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_items" (
	"id" text PRIMARY KEY NOT NULL,
	"transfer_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "transfer_items_quantity_positive" CHECK (quantity > 0)
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"source_location_id" text NOT NULL,
	"destination_location_id" text NOT NULL,
	"status" "transfer_status" DEFAULT 'DRAFT' NOT NULL,
	"requested_by" text,
	"approved_by" text,
	"received_by" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"received_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "publication_status" "publication_status" DEFAULT 'review' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "availability_status" "availability_status" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "editorial_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "publication_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "publication_changed_by" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "publication_note" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_code" "app_role";--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_transfer_id_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_source_location_id_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_destination_location_id_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_balances_product_location_unique" ON "inventory_balances" USING btree ("product_id","location_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_product_location_idx" ON "inventory_movements" USING btree ("product_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_code_unique" ON "locations" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "transfer_items_transfer_product_unique" ON "transfer_items" USING btree ("transfer_id","product_id");--> statement-breakpoint
CREATE INDEX "products_publication_status_idx" ON "products" USING btree ("publication_status");