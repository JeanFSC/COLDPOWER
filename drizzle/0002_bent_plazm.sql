ALTER TABLE "quotes" ADD COLUMN "customer_type" text DEFAULT 'natural' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "document_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "department" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "province" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "district" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "preferred_contact" text DEFAULT 'whatsapp' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "consent_at" timestamp with time zone;