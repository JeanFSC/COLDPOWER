-- Rollback manual del Bloque F. Ejecutar solo con backup y ventana de mantenimiento confirmados.
DROP TABLE IF EXISTS import_documents;
DROP TABLE IF EXISTS purchase_receipt_items;
DROP TABLE IF EXISTS purchase_receipts;
DROP TABLE IF EXISTS purchase_items;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS suppliers;
DROP TYPE IF EXISTS purchase_receipt_status;
DROP TYPE IF EXISTS purchase_status;
DROP TYPE IF EXISTS supplier_status;
