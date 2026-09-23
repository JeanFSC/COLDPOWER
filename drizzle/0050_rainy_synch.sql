CREATE SEQUENCE "public_complaint_ticket_number_seq" START WITH 1 INCREMENT BY 1;--> statement-breakpoint
CREATE TYPE "public"."public_complaint_status" AS ENUM('RECEIVED', 'IN_REVIEW', 'RESOLVED', 'CLOSED');--> statement-breakpoint
CREATE TABLE "public_complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_number" varchar(32) NOT NULL,
	"request_id" text NOT NULL,
	"complainant_name" text NOT NULL,
	"document_type" varchar(24) NOT NULL,
	"document_number" varchar(32) NOT NULL,
	"email" varchar(180) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"address" text NOT NULL,
	"complaint_type" varchar(16) NOT NULL,
	"detail" text NOT NULL,
	"product_reference" text,
	"status" "public_complaint_status" DEFAULT 'RECEIVED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "public_complaints_ticket_unique" ON "public_complaints" USING btree ("ticket_number");--> statement-breakpoint
CREATE UNIQUE INDEX "public_complaints_request_unique" ON "public_complaints" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "public_complaints_status_idx" ON "public_complaints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "public_complaints_created_at_idx" ON "public_complaints" USING btree ("created_at");
