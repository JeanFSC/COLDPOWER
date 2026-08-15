ALTER TYPE "public"."price_type" ADD VALUE 'SPECIAL';--> statement-breakpoint
ALTER TYPE "public"."publication_status" ADD VALUE 'archived';--> statement-breakpoint
ALTER TYPE "public"."customer_type" ADD VALUE 'PERSON' BEFORE 'CONSUMIDOR';--> statement-breakpoint
ALTER TYPE "public"."customer_type" ADD VALUE 'COMPANY' BEFORE 'CONSUMIDOR';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'RECEIVED' BEFORE 'PAYMENT_PENDING';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'READY' BEFORE 'READY_FOR_PICKUP';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'IN_TRANSIT' BEFORE 'SHIPPED';--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'UNDER_REVIEW' BEFORE 'APPROVED';--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'CONFIRMED' BEFORE 'APPROVED';--> statement-breakpoint
CREATE TABLE "cms_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"section_id" text NOT NULL,
	"entry_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "cms_block_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "cms_block_status" NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"key" text NOT NULL,
	"title" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "cms_block_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"label" text NOT NULL,
	"address" text NOT NULL,
	"country" text,
	"department" text,
	"province" text,
	"district" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"email" text,
	"phone" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"body" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"type" "crm_activity_type" NOT NULL,
	"subject" text NOT NULL,
	"body" text,
	"performed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_followups" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"title" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" "crm_task_status" DEFAULT 'PENDING' NOT NULL,
	"assigned_to" text,
	"completed_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"provider" text,
	"provider_reference" text,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"storage_key" text,
	"original_filename" text,
	"mime_type" text,
	"byte_size" integer,
	"external_reference" text,
	"submitted_by" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_prices" ALTER COLUMN "currency" SET DEFAULT 'PEN';--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "trade_name" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "district" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "sales_email" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "business_hours" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "facebook" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "instagram" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "tiktok" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "public_url" text;--> statement-breakpoint
ALTER TABLE "product_prices" ADD COLUMN "wholesale_min_qty" integer;--> statement-breakpoint
ALTER TABLE "product_prices" ADD COLUMN "minimum_allowed" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_prices" ADD COLUMN "status" text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "workflow_status" text DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "cancelled_by" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "cancelled_by" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancelled_by" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "invoice_status" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "external_invoice_reference" text;--> statement-breakpoint
ALTER TABLE "cms_entries" ADD CONSTRAINT "cms_entries_section_id_cms_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."cms_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_revisions" ADD CONSTRAINT "cms_revisions_entry_id_cms_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."cms_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_sections" ADD CONSTRAINT "cms_sections_page_id_cms_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_followups" ADD CONSTRAINT "opportunity_followups_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_evidence" ADD CONSTRAINT "payment_evidence_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cms_entries_section_key_unique" ON "cms_entries" USING btree ("section_id","entry_key");--> statement-breakpoint
CREATE INDEX "cms_entries_status_idx" ON "cms_entries" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_revisions_entry_version_unique" ON "cms_revisions" USING btree ("entry_id","version");--> statement-breakpoint
CREATE INDEX "cms_revisions_entry_idx" ON "cms_revisions" USING btree ("entry_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_sections_page_key_unique" ON "cms_sections" USING btree ("page_id","key");--> statement-breakpoint
CREATE INDEX "cms_sections_page_order_idx" ON "cms_sections" USING btree ("page_id","sort_order");--> statement-breakpoint
CREATE INDEX "customer_addresses_customer_idx" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_addresses_primary_idx" ON "customer_addresses" USING btree ("customer_id","is_primary");--> statement-breakpoint
CREATE INDEX "customer_contacts_customer_idx" ON "customer_contacts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_contacts_primary_idx" ON "customer_contacts" USING btree ("customer_id","is_primary");--> statement-breakpoint
CREATE INDEX "customer_notes_customer_idx" ON "customer_notes" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "opportunity_activities_opportunity_idx" ON "opportunity_activities" USING btree ("opportunity_id","created_at");--> statement-breakpoint
CREATE INDEX "opportunity_followups_opportunity_idx" ON "opportunity_followups" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_followups_due_idx" ON "opportunity_followups" USING btree ("due_at","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_idempotency_unique" ON "payment_attempts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payment_attempts_payment_idx" ON "payment_attempts" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_evidence_payment_idx" ON "payment_evidence" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_reservations_idempotency_unique" ON "inventory_reservations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "media_assets_hash_idx" ON "media_assets" USING btree ("content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_user_id_unique" ON "customers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_idempotency_unique" ON "sales" USING btree ("idempotency_key");
