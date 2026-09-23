CREATE TABLE "crm_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"activity_id" text,
	"original_filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_attachments_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "crm_attachments" ADD CONSTRAINT "crm_attachments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_attachments" ADD CONSTRAINT "crm_attachments_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_attachments" ADD CONSTRAINT "crm_attachments_activity_id_crm_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."crm_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_attachments_customer_idx" ON "crm_attachments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "crm_attachments_opportunity_idx" ON "crm_attachments" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "crm_attachments_activity_idx" ON "crm_attachments" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "crm_attachments_hash_idx" ON "crm_attachments" USING btree ("content_hash");