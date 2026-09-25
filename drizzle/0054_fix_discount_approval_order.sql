ALTER TABLE "discount_rules" DROP CONSTRAINT IF EXISTS "discount_rules_approval_order";
ALTER TABLE "discount_rules" ADD CONSTRAINT "discount_rules_approval_order" CHECK (approval_above_percentage <= max_percentage);
