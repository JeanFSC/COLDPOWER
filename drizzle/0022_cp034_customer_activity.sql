ALTER TABLE "customers" ADD COLUMN "last_activity_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "crm_activities" ADD COLUMN "idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD COLUMN "idempotency_key" text;
--> statement-breakpoint
CREATE INDEX "customers_last_activity_idx" ON "customers" USING btree ("last_activity_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_activities_idempotency_unique" ON "crm_activities" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_tasks_idempotency_unique" ON "crm_tasks" USING btree ("idempotency_key");
