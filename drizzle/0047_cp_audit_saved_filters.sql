CREATE TABLE "audit_saved_filters" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_saved_filters_owner_idx" ON "audit_saved_filters" USING btree ("owner_id");
