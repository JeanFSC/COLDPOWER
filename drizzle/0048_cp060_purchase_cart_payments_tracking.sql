CREATE TYPE "public"."shipment_status" AS ENUM('LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'AT_AGENCY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION');--> statement-breakpoint
CREATE TYPE "public"."shopping_cart_status" AS ENUM('ACTIVE', 'CONVERTED', 'MERGED');--> statement-breakpoint
CREATE TABLE "shipment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"shipment_id" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"status" "shipment_status" NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"provider" text NOT NULL,
	"carrier" text NOT NULL,
	"tracking_number" text NOT NULL,
	"tracking_url" text,
	"status" "shipment_status" DEFAULT 'LABEL_CREATED' NOT NULL,
	"estimated_delivery_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_cart_items" (
	"id" text PRIMARY KEY NOT NULL,
	"cart_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_cart_items_quantity_positive" CHECK (quantity > 0 AND quantity <= 999)
);
--> statement-breakpoint
CREATE TABLE "shopping_carts" (
	"id" text PRIMARY KEY NOT NULL,
	"session_token" text,
	"user_id" text,
	"status" "shopping_cart_status" DEFAULT 'ACTIVE' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_details" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_cart_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_cart_version" integer;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_cart_items" ADD CONSTRAINT "shopping_cart_items_cart_id_shopping_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."shopping_carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_cart_items" ADD CONSTRAINT "shopping_cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_carts" ADD CONSTRAINT "shopping_carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_events_provider_event_unique" ON "shipment_events" USING btree ("shipment_id","provider_event_id");--> statement-breakpoint
CREATE INDEX "shipment_events_shipment_idx" ON "shipment_events" USING btree ("shipment_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_order_unique" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_provider_tracking_unique" ON "shipments" USING btree ("provider","tracking_number");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_cart_items_cart_product_unique" ON "shopping_cart_items" USING btree ("cart_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_carts_active_session_unique" ON "shopping_carts" USING btree ("session_token") WHERE "shopping_carts"."status" = 'ACTIVE' and "shopping_carts"."session_token" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_carts_active_user_unique" ON "shopping_carts" USING btree ("user_id") WHERE "shopping_carts"."status" = 'ACTIVE' and "shopping_carts"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "shopping_carts_status_idx" ON "shopping_carts" USING btree ("status");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_payment_due_idx" ON "orders" USING btree ("status","payment_due_at");--> statement-breakpoint
UPDATE "orders" SET "user_id" = "customers"."user_id" FROM "customers" WHERE "orders"."customer_id" = "customers"."id" AND "customers"."user_id" IS NOT NULL AND "orders"."user_id" IS NULL;
