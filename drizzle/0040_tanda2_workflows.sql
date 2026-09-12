DO $$ BEGIN ALTER TYPE "public"."cms_page_status" ADD VALUE IF NOT EXISTS 'SCHEDULED' BEFORE 'PUBLISHED'; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."cms_page_status" ADD VALUE IF NOT EXISTS 'ARCHIVED'; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."cms_block_status" ADD VALUE IF NOT EXISTS 'SCHEDULED' BEFORE 'PUBLISHED'; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."cms_block_status" ADD VALUE IF NOT EXISTS 'ARCHIVED'; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."cms_content_type" AS ENUM('PAGE','BANNER','LANDING','BLOCK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."purchase_request_status" AS ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED','CONVERTED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."purchase_request_source" AS ENUM('MANUAL','STOCK_ALERT','REPLENISHMENT','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."notification_rule_status" AS ENUM('ACTIVE','INACTIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."notification_schedule_status" AS ENUM('SCHEDULED','SENT','CANCELLED','FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."operations_work_item_source_type" AS ENUM('QUOTE','OPPORTUNITY','ORDER','FOLLOW_UP','INVENTORY','TRANSFER','PAYMENT','PURCHASE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."operations_work_item_status" AS ENUM('PENDING','IN_PROGRESS','RESOLVED','STALE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."operations_work_item_urgency" AS ENUM('LOW','NORMAL','MEDIUM','HIGH','CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "cms_pages" ADD COLUMN IF NOT EXISTS "content_type" "public"."cms_content_type" NOT NULL DEFAULT 'PAGE';
ALTER TABLE "cms_pages" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp with time zone;
ALTER TABLE "cms_pages" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
ALTER TABLE "cms_pages" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;
ALTER TABLE "cms_blocks" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp with time zone;
CREATE INDEX IF NOT EXISTS "cms_pages_schedule_idx" ON "cms_pages" ("status","scheduled_at");

ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "request_id" text;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "issued_at" timestamp with time zone;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "expected_delivery_at" timestamp with time zone;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "cancelled_by" text;
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
ALTER TABLE "purchase_receipts" ADD COLUMN IF NOT EXISTS "received_at" timestamp with time zone DEFAULT now();
UPDATE "purchase_receipts" SET "received_at" = "created_at" WHERE "received_at" IS NULL;
ALTER TABLE "purchase_receipts" ALTER COLUMN "received_at" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "purchase_requests" (
 "id" text PRIMARY KEY NOT NULL, "code" text NOT NULL, "requester_id" text, "location_id" text,
 "source" "public"."purchase_request_source" DEFAULT 'MANUAL' NOT NULL,
 "status" "public"."purchase_request_status" DEFAULT 'DRAFT' NOT NULL,
 "notes" text, "rejection_reason" text, "approved_by" text, "approved_at" timestamp with time zone,
 "converted_purchase_id" text, "idempotency_key" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "purchase_request_items" (
 "id" text PRIMARY KEY NOT NULL, "request_id" text NOT NULL, "product_id" text NOT NULL,
 "sku_snapshot" text NOT NULL, "product_name_snapshot" text NOT NULL, "quantity_requested" integer NOT NULL,
 "notes" text, "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "purchase_request_items_quantity_positive" CHECK (quantity_requested > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requests_code_unique" ON "purchase_requests" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requests_idempotency_unique" ON "purchase_requests" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "purchase_requests_status_idx" ON "purchase_requests" ("status");
CREATE INDEX IF NOT EXISTS "purchase_requests_source_idx" ON "purchase_requests" ("source");
CREATE INDEX IF NOT EXISTS "purchase_requests_requester_idx" ON "purchase_requests" ("requester_id");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_request_items_request_product_unique" ON "purchase_request_items" ("request_id","product_id");
CREATE INDEX IF NOT EXISTS "purchases_expected_delivery_idx" ON "purchases" ("expected_delivery_at");
CREATE INDEX IF NOT EXISTS "purchases_request_idx" ON "purchases" ("request_id");
CREATE INDEX IF NOT EXISTS "purchase_receipts_received_idx" ON "purchase_receipts" ("received_at");
DO $$ BEGIN ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_request_id_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchases" ADD CONSTRAINT "purchases_request_id_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchases" ADD CONSTRAINT "purchases_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_converted_purchase_id_purchases_id_fk" FOREIGN KEY ("converted_purchase_id") REFERENCES "public"."purchases"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "notification_templates" (
 "id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "title_template" text NOT NULL, "body_template" text NOT NULL,
 "link_template" text, "variables" text[] DEFAULT '{}' NOT NULL, "enabled" boolean DEFAULT true NOT NULL,
 "created_by" text, "updated_by" text, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "notification_rules" (
 "id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "event_type" text NOT NULL,
 "status" "public"."notification_rule_status" DEFAULT 'ACTIVE' NOT NULL, "severity" text DEFAULT 'INFO' NOT NULL,
 "audience_roles" text[] DEFAULT '{}' NOT NULL, "audience_user_ids" text[] DEFAULT '{}' NOT NULL,
 "assignee_audience" boolean DEFAULT false NOT NULL, "condition" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "template_id" text, "cooldown_seconds" integer DEFAULT 0 NOT NULL, "created_by" text, "updated_by" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "notification_schedules" (
 "id" text PRIMARY KEY NOT NULL, "rule_id" text, "template_id" text, "title" text NOT NULL, "body" text NOT NULL, "link" text,
 "recipient_roles" text[] DEFAULT '{}' NOT NULL, "recipient_user_ids" text[] DEFAULT '{}' NOT NULL,
 "scheduled_at" timestamp with time zone NOT NULL, "status" "public"."notification_schedule_status" DEFAULT 'SCHEDULED' NOT NULL,
 "idempotency_key" text, "created_by" text, "sent_at" timestamp with time zone, "cancelled_at" timestamp with time zone,
 "error" text, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_name_unique" ON "notification_templates" ("name");
CREATE INDEX IF NOT EXISTS "notification_templates_enabled_idx" ON "notification_templates" ("enabled");
CREATE INDEX IF NOT EXISTS "notification_rules_event_idx" ON "notification_rules" ("event_type","status");
CREATE INDEX IF NOT EXISTS "notification_rules_template_idx" ON "notification_rules" ("template_id");
CREATE INDEX IF NOT EXISTS "notification_schedules_status_scheduled_idx" ON "notification_schedules" ("status","scheduled_at");
CREATE UNIQUE INDEX IF NOT EXISTS "notification_schedules_idempotency_unique" ON "notification_schedules" ("idempotency_key");
DO $$ BEGIN ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_rule_id_notification_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."notification_rules"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "admin_workspace_preferences" (
 "user_id" text PRIMARY KEY NOT NULL, "favorites" jsonb DEFAULT '[]'::jsonb NOT NULL, "quick_actions" text[] DEFAULT '{}' NOT NULL,
 "widget_order" text[] DEFAULT '{}' NOT NULL, "collapsed_widgets" text[] DEFAULT '{}' NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "admin_recent_items" (
 "id" text PRIMARY KEY NOT NULL, "user_id" text NOT NULL, "entity_type" text NOT NULL, "entity_id" text NOT NULL,
 "label" text NOT NULL, "href" text NOT NULL, "visited_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "admin_recent_items_user_visited_idx" ON "admin_recent_items" ("user_id","visited_at");
CREATE UNIQUE INDEX IF NOT EXISTS "admin_recent_items_user_entity_unique" ON "admin_recent_items" ("user_id","entity_type","entity_id");
DO $$ BEGIN ALTER TABLE "admin_workspace_preferences" ADD CONSTRAINT "admin_workspace_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "admin_recent_items" ADD CONSTRAINT "admin_recent_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "operations_work_items" (
 "id" text PRIMARY KEY NOT NULL, "work_type" text NOT NULL, "source_type" "public"."operations_work_item_source_type" NOT NULL, "source_id" text NOT NULL,
 "reference" text NOT NULL, "title" text NOT NULL, "customer" text, "location" text,
 "status" "public"."operations_work_item_status" DEFAULT 'PENDING' NOT NULL, "urgency" "public"."operations_work_item_urgency" DEFAULT 'NORMAL' NOT NULL,
 "due_at" timestamp with time zone, "blocker" boolean DEFAULT false NOT NULL, "next_action" text, "source_owner_id" text,
 "assignee_id" text, "team" text, "allowed_actions" jsonb DEFAULT '[]'::jsonb NOT NULL, "source_updated_at" timestamp with time zone,
 "resolved_at" timestamp with time zone, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "operations_work_item_history" (
 "id" text PRIMARY KEY NOT NULL, "work_item_id" text NOT NULL, "actor_id" text, "action" text NOT NULL,
 "from_assignee_id" text, "to_assignee_id" text, "from_status" "public"."operations_work_item_status", "note" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "operations_work_items_source_unique" ON "operations_work_items" ("source_type","source_id");
CREATE INDEX IF NOT EXISTS "operations_work_items_status_idx" ON "operations_work_items" ("status","urgency");
CREATE INDEX IF NOT EXISTS "operations_work_items_assignee_idx" ON "operations_work_items" ("assignee_id");
CREATE INDEX IF NOT EXISTS "operations_work_items_due_idx" ON "operations_work_items" ("due_at");
CREATE INDEX IF NOT EXISTS "operations_work_item_history_item_idx" ON "operations_work_item_history" ("work_item_id","created_at");
DO $$ BEGIN ALTER TABLE "operations_work_items" ADD CONSTRAINT "operations_work_items_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "operations_work_item_history" ADD CONSTRAINT "operations_work_item_history_work_item_id_operations_work_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."operations_work_items"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "operations_work_item_history" ADD CONSTRAINT "operations_work_item_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
