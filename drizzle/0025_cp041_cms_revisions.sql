CREATE TABLE IF NOT EXISTS "cms_page_revisions" (
  "id" text PRIMARY KEY NOT NULL,
  "page_id" text NOT NULL REFERENCES "cms_pages"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "title" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" "cms_page_status" NOT NULL,
  "summary" text NOT NULL,
  "created_by" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "cms_page_revisions_page_version_unique" ON "cms_page_revisions" ("page_id", "version");
CREATE INDEX IF NOT EXISTS "cms_page_revisions_page_created_idx" ON "cms_page_revisions" ("page_id", "created_at");
