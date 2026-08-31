-- Rollback manual del Bloque E. Ejecutar solo con una ventana de mantenimiento y backup confirmado.
DROP TABLE IF EXISTS payment_events;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;
DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS payment_method_type;
DROP TYPE IF EXISTS delivery_method;
DROP TYPE IF EXISTS order_status;
DROP TYPE IF EXISTS sale_status;
