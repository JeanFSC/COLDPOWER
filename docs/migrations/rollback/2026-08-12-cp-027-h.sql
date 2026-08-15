-- Rollback manual del Bloque H. Ejecutar solo con backup y ventana de mantenimiento confirmados.
ALTER TABLE company_settings DROP COLUMN IF EXISTS legal_links;
ALTER TABLE company_settings DROP COLUMN IF EXISTS coverage;
ALTER TABLE company_settings DROP COLUMN IF EXISTS guarantee_terms;
ALTER TABLE company_settings DROP COLUMN IF EXISTS payment_methods;
