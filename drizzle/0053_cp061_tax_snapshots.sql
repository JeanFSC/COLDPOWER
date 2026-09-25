ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "tax_rate" numeric(5, 2);
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "tax_mode" "quote_tax_mode";

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) NOT NULL DEFAULT '0.00';
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "tax_rate" numeric(5, 2);
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "tax_mode" "quote_tax_mode" NOT NULL DEFAULT 'UNCONFIGURED';

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 2) NOT NULL DEFAULT '0.00';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_rate" numeric(5, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_mode" "quote_tax_mode" NOT NULL DEFAULT 'UNCONFIGURED';
