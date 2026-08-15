CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_ci_unique" ON "categories" (lower("slug"));
CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_ci_unique" ON "categories" (lower("name"));
CREATE UNIQUE INDEX IF NOT EXISTS "families_slug_ci_unique" ON "families" (lower("slug"));
CREATE UNIQUE INDEX IF NOT EXISTS "families_category_name_ci_unique" ON "families" ("category_id", lower("name"));
CREATE UNIQUE INDEX IF NOT EXISTS "brands_slug_ci_unique" ON "brands" (lower("slug"));
CREATE UNIQUE INDEX IF NOT EXISTS "brands_name_ci_unique" ON "brands" (lower("name"));
