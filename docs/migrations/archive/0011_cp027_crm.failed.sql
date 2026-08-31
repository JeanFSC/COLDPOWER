ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_code_unique";--> statement-breakpoint
DROP INDEX "opportunities_code_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_code_unique_idx" ON "opportunities" USING btree ("code");