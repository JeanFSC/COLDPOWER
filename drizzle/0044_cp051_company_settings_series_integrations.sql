CREATE TYPE "public"."integration_connection_status" AS ENUM('CONNECTED', 'TESTING', 'DISCONNECTED', 'NOT_CONFIGURED');--> statement-breakpoint
CREATE TABLE "document_series" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"document_type" text NOT NULL,
	"prefix" text NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	"padding" integer DEFAULT 6 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"last_checked_status" "integration_connection_status" DEFAULT 'NOT_CONFIGURED' NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_checked_message" text,
	"last_checked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "logo_media_id" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "favicon_media_id" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "primary_color" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "secondary_color" text;--> statement-breakpoint
CREATE UNIQUE INDEX "document_series_code_unique" ON "document_series" USING btree ("code");--> statement-breakpoint
CREATE INDEX "document_series_active_idx" ON "document_series" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_key_unique" ON "integration_connections" USING btree ("key");
