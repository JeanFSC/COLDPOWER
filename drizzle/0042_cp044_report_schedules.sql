DO $$ BEGIN CREATE TYPE "public"."report_schedule_frequency" AS ENUM('DAILY','WEEKLY','MONTHLY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."report_schedule_status" AS ENUM('ACTIVE','PAUSED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "public"."report_schedule_run_status" AS ENUM('PENDING','RUNNING','SUCCEEDED','FAILED','SKIPPED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "report_schedules" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "report_key" text DEFAULT 'operations-summary' NOT NULL,
  "frequency" "public"."report_schedule_frequency" NOT NULL,
  "filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "recipient_roles" text[] DEFAULT '{}' NOT NULL,
  "recipient_user_ids" text[] DEFAULT '{}' NOT NULL,
  "next_run_at" timestamp with time zone NOT NULL,
  "last_run_at" timestamp with time zone,
  "status" "public"."report_schedule_status" DEFAULT 'ACTIVE' NOT NULL,
  "idempotency_key" text NOT NULL,
  "created_by" text NOT NULL,
  "updated_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "report_schedules_idempotency_unique" ON "report_schedules" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "report_schedules_owner_idx" ON "report_schedules" ("created_by","status");
CREATE INDEX IF NOT EXISTS "report_schedules_next_run_idx" ON "report_schedules" ("status","next_run_at");
DO $$ BEGIN ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "report_schedule_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "schedule_id" text NOT NULL,
  "scheduled_for" timestamp with time zone NOT NULL,
  "status" "public"."report_schedule_run_status" DEFAULT 'PENDING' NOT NULL,
  "filter_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "notification_count" integer DEFAULT 0 NOT NULL,
  "error" text,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "report_schedule_runs_schedule_date_unique" ON "report_schedule_runs" ("schedule_id","scheduled_for");
CREATE INDEX IF NOT EXISTS "report_schedule_runs_schedule_idx" ON "report_schedule_runs" ("schedule_id","created_at");
CREATE INDEX IF NOT EXISTS "report_schedule_runs_status_idx" ON "report_schedule_runs" ("status","scheduled_for");
DO $$ BEGIN ALTER TABLE "report_schedule_runs" ADD CONSTRAINT "report_schedule_runs_schedule_id_report_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."report_schedules"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
