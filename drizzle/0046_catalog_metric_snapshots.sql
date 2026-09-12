CREATE TABLE IF NOT EXISTS "catalog_metric_snapshots" (
  "snapshot_date" date PRIMARY KEY NOT NULL,
  "total_products" integer NOT NULL,
  "published_products" integer NOT NULL,
  "review_products" integer NOT NULL,
  "products_requiring_review" integer NOT NULL,
  "duplicate_products" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
