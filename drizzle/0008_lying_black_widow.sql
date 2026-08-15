CREATE TYPE "public"."cms_block_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."cms_block_type" AS ENUM('hero', 'banner', 'text', 'contact', 'links', 'promo');--> statement-breakpoint
CREATE TYPE "public"."cms_page_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('IMAGE');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "cms_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"block_key" text NOT NULL,
	"type" "cms_block_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"sort_order" integer NOT NULL,
	"status" "cms_block_status" DEFAULT 'DRAFT' NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"status" "cms_page_status" DEFAULT 'DRAFT' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media_asset_usages" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"slot" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"kind" "media_kind" DEFAULT 'IMAGE' NOT NULL,
	"status" "media_status" DEFAULT 'ACTIVE' NOT NULL,
	"uploaded_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "commercial_name" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_blocks" ADD CONSTRAINT "cms_blocks_page_id_cms_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."cms_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset_usages" ADD CONSTRAINT "media_asset_usages_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cms_blocks_page_key_unique" ON "cms_blocks" USING btree ("page_id","block_key");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_blocks_page_order_unique" ON "cms_blocks" USING btree ("page_id","sort_order");--> statement-breakpoint
CREATE INDEX "cms_blocks_page_idx" ON "cms_blocks" USING btree ("page_id","status");--> statement-breakpoint
CREATE INDEX "cms_pages_status_idx" ON "cms_pages" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "media_asset_usages_unique" ON "media_asset_usages" USING btree ("asset_id","entity_type","entity_id","slot");--> statement-breakpoint
CREATE INDEX "media_asset_usages_entity_idx" ON "media_asset_usages" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "media_assets_status_idx" ON "media_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "media_assets_created_at_idx" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_featured_idx" ON "products" USING btree ("featured");