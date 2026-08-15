-- Rollback manual CP-027 Bloque B.
-- Ejecutar solo después de confirmar que no existen usos/media/CMS que deban conservarse.
-- No elimina productos, categorías, cotizaciones, inventario ni auditoría histórica.

DROP TABLE IF EXISTS media_asset_usages;
DROP TABLE IF EXISTS cms_blocks;
DROP TABLE IF EXISTS media_assets;
DROP TABLE IF EXISTS cms_pages;
DROP INDEX IF EXISTS products_featured_idx;
ALTER TABLE products DROP COLUMN IF EXISTS commercial_name;
ALTER TABLE products DROP COLUMN IF EXISTS featured;
DROP TYPE IF EXISTS cms_block_status;
DROP TYPE IF EXISTS cms_block_type;
DROP TYPE IF EXISTS cms_page_status;
DROP TYPE IF EXISTS media_kind;
DROP TYPE IF EXISTS media_status;
