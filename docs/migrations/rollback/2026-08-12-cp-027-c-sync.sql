-- Rollback manual del Bloque C. Ejecutar solo con backup y aprobación operativa.
DROP TABLE IF EXISTS price_history;
DROP TABLE IF EXISTS product_prices;
DROP TABLE IF EXISTS discount_rules;
DROP TYPE IF EXISTS price_type;
DROP TYPE IF EXISTS discount_rule_status;
