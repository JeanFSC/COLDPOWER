-- Rollback CP-027 Bloque C: elimina únicamente tablas/tipos agregados por precios.
-- No elimina productos, stock, Kardex, auditoría ni cotizaciones.
DROP TABLE IF EXISTS "price_history";
DROP TABLE IF EXISTS "product_prices";
DROP TABLE IF EXISTS "discount_rules";
DROP TYPE IF EXISTS "price_type";
DROP TYPE IF EXISTS "discount_rule_status";
