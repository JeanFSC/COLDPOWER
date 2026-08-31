ALTER TABLE "company_settings" ADD COLUMN "payment_methods" text[];--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "guarantee_terms" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "coverage" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "legal_links" jsonb;