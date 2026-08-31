CREATE TYPE "public"."price_type" AS ENUM('COST', 'RETAIL', 'WHOLESALE', 'MINIMUM');--> statement-breakpoint
CREATE TYPE "public"."discount_rule_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "product_prices" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "price_type" "price_type" NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "currency" varchar(3) NOT NULL,
  "valid_from" timestamp with time zone NOT NULL,
  "valid_until" timestamp with time zone,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_prices_amount_positive" CHECK (amount > 0),
  CONSTRAINT "product_prices_valid_window" CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT "product_prices_currency_length" CHECK (char_length(currency) = 3)
);--> statement-breakpoint
CREATE TABLE "price_history" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "price_id" text,
  "price_type" "price_type" NOT NULL,
  "previous_amount" numeric(12,2),
  "new_amount" numeric(12,2) NOT NULL,
  "currency" varchar(3) NOT NULL,
  "reason" text,
  "changed_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "price_history_new_amount_positive" CHECK (new_amount > 0),
  CONSTRAINT "price_history_previous_amount_positive" CHECK (previous_amount IS NULL OR previous_amount > 0)
);--> statement-breakpoint
CREATE TABLE "discount_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "max_percentage" numeric(5,2) NOT NULL,
  "approval_above_percentage" numeric(5,2) NOT NULL,
  "status" "discount_rule_status" DEFAULT 'ACTIVE' NOT NULL,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "discount_rules_max_percentage_range" CHECK (max_percentage >= 0 AND max_percentage <= 100),
  CONSTRAINT "discount_rules_approval_percentage_range" CHECK (approval_above_percentage >= 0 AND approval_above_percentage <= 100),
  CONSTRAINT "discount_rules_approval_order" CHECK (approval_above_percentage >= max_percentage)
);--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_price_id_product_prices_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."product_prices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_prices_product_type_active_idx" ON "product_prices" USING btree ("product_id", "price_type", "active");--> statement-breakpoint
CREATE INDEX "product_prices_valid_window_idx" ON "product_prices" USING btree ("valid_from", "valid_until");--> statement-breakpoint
CREATE INDEX "price_history_product_created_idx" ON "price_history" USING btree ("product_id", "created_at");--> statement-breakpoint
CREATE INDEX "discount_rules_status_idx" ON "discount_rules" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "discount_rules_name_unique" ON "discount_rules" USING btree ("name");
