ALTER TYPE "public"."app_role" ADD VALUE IF NOT EXISTS 'GERENCIA';--> statement-breakpoint
ALTER TYPE "public"."app_role" ADD VALUE IF NOT EXISTS 'OPERACIONES_VENTAS';--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "user_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_sign_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_role_changed_at" timestamp with time zone;
