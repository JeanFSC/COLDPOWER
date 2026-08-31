CREATE TYPE "public"."crm_activity_type" AS ENUM('CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'TASK', 'NOTE');--> statement-breakpoint
CREATE TYPE "public"."crm_task_status" AS ENUM('PENDING', 'COMPLETED', 'OVERDUE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('ACTIVE', 'INACTIVE', 'PROSPECT');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('CONSUMIDOR', 'TECNICO', 'EMPRESA', 'DISTRIBUIDOR', 'MAYORISTA');--> statement-breakpoint
CREATE TYPE "public"."opportunity_origin" AS ENUM('WEB', 'WHATSAPP', 'TELEFONO', 'LOCAL', 'REFERIDO', 'CLIENTE_RECURRENTE', 'OTRO');--> statement-breakpoint
CREATE TYPE "public"."opportunity_stage" AS ENUM('NEW', 'CONTACTED', 'QUOTING', 'QUOTE_SENT', 'FOLLOW_UP', 'NEGOTIATION', 'ACCEPTED', 'SALE', 'PAYMENT_PENDING', 'PAID', 'PREPARING', 'DELIVERED', 'CLOSED', 'LOST', 'CANCELLED', 'NO_RESPONSE');--> statement-breakpoint
CREATE TABLE "crm_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"opportunity_id" text,
	"quote_id" text,
	"type" "crm_activity_type" NOT NULL,
	"subject" text NOT NULL,
	"body" text,
	"performed_by" text,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"opportunity_id" text,
	"quote_id" text,
	"title" text NOT NULL,
	"description" text,
	"status" "crm_task_status" DEFAULT 'PENDING' NOT NULL,
	"assigned_to" text,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_quote_links" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"opportunity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"legal_name" text,
	"document_number" text,
	"ruc" text,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"address" text,
	"location" text,
	"customer_type" "customer_type" DEFAULT 'CONSUMIDOR' NOT NULL,
	"assigned_seller_id" text,
	"notes" text,
	"status" "customer_status" DEFAULT 'PROSPECT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"customer_id" text NOT NULL,
	"quote_id" text,
	"title" text NOT NULL,
	"origin" "opportunity_origin" DEFAULT 'WEB' NOT NULL,
	"stage" "opportunity_stage" DEFAULT 'NEW' NOT NULL,
	"assigned_seller_id" text,
	"total_amount" numeric(14, 2),
	"currency" varchar(3),
	"discount_percentage" numeric(5, 2),
	"margin_amount" numeric(14, 2),
	"last_contact_at" timestamp with time zone,
	"next_action" text,
	"follow_up_at" timestamp with time zone,
	"notes" text,
	"lost_reason" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_items" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"product_id" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(14, 2),
	"currency" varchar(3),
	"discount_percentage" numeric(5, 2),
	"line_total" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_items_quantity_positive" CHECK (quantity > 0)
);
--> statement-breakpoint
CREATE TABLE "opportunity_stage_history" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"from_stage" "opportunity_stage",
	"to_stage" "opportunity_stage" NOT NULL,
	"changed_by" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_quote_links" ADD CONSTRAINT "customer_quote_links_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_quote_links" ADD CONSTRAINT "customer_quote_links_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_quote_links" ADD CONSTRAINT "customer_quote_links_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_items" ADD CONSTRAINT "opportunity_items_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_items" ADD CONSTRAINT "opportunity_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_activities_customer_idx" ON "crm_activities" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "crm_activities_opportunity_idx" ON "crm_activities" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "crm_activities_due_idx" ON "crm_activities" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "crm_tasks_status_idx" ON "crm_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crm_tasks_assigned_idx" ON "crm_tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "crm_tasks_due_idx" ON "crm_tasks" USING btree ("due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_quote_links_quote_unique" ON "customer_quote_links" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "customer_quote_links_customer_idx" ON "customer_quote_links" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customers_assigned_seller_idx" ON "customers" USING btree ("assigned_seller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_code_unique_idx" ON "opportunities" USING btree ("code");--> statement-breakpoint
CREATE INDEX "opportunities_customer_idx" ON "opportunities" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "opportunities_stage_idx" ON "opportunities" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "opportunities_seller_idx" ON "opportunities" USING btree ("assigned_seller_id");--> statement-breakpoint
CREATE INDEX "opportunities_follow_up_idx" ON "opportunities" USING btree ("follow_up_at");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_quote_unique" ON "opportunities" USING btree ("quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_items_product_unique" ON "opportunity_items" USING btree ("opportunity_id","product_id");--> statement-breakpoint
CREATE INDEX "opportunity_items_opportunity_idx" ON "opportunity_items" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_stage_history_opportunity_idx" ON "opportunity_stage_history" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunity_stage_history_created_idx" ON "opportunity_stage_history" USING btree ("created_at");