ALTER TYPE "public"."quote_status" ADD VALUE 'borrador' BEFORE 'nuevo';--> statement-breakpoint
ALTER TYPE "public"."quote_status" ADD VALUE 'enviada' BEFORE 'nuevo';--> statement-breakpoint
ALTER TYPE "public"."quote_status" ADD VALUE 'evaluacion' BEFORE 'nuevo';--> statement-breakpoint
ALTER TYPE "public"."quote_status" ADD VALUE 'requiere_info' BEFORE 'nuevo';--> statement-breakpoint
ALTER TYPE "public"."quote_status" ADD VALUE 'cotizada' BEFORE 'nuevo';--> statement-breakpoint
ALTER TYPE "public"."quote_status" ADD VALUE 'aprobada' BEFORE 'nuevo';--> statement-breakpoint
ALTER TYPE "public"."quote_status" ADD VALUE 'convertida' BEFORE 'nuevo';--> statement-breakpoint
ALTER TYPE "public"."quote_status" ADD VALUE 'cerrada' BEFORE 'nuevo';--> statement-breakpoint
CREATE TABLE "quote_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"from_status" text,
	"to_status" "quote_status" NOT NULL,
	"changed_by" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "status" SET DEFAULT 'enviada';--> statement-breakpoint
ALTER TABLE "quote_status_history" ADD CONSTRAINT "quote_status_history_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;