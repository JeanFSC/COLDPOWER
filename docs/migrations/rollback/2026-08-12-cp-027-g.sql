-- Rollback manual del Bloque G. Ejecutar solo con backup y ventana de mantenimiento confirmados.
DROP TABLE IF EXISTS promotion_categories;
DROP TABLE IF EXISTS promotion_products;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS notifications;
DROP TYPE IF EXISTS promotion_status;
DROP TYPE IF EXISTS promotion_type;
DROP TYPE IF EXISTS notification_state;
