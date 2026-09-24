CREATE TABLE "newsletter_subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(180) NOT NULL,
	"status" text DEFAULT 'SUBSCRIBED' NOT NULL,
	"source" text DEFAULT 'HOME_FOOTER' NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_email_unique" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_status_idx" ON "newsletter_subscribers" USING btree ("status");