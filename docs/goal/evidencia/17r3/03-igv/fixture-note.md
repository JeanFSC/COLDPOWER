# Evidencia R3.3 — configuración tributaria temporal

La prueba usa la configuración existente de `company_settings.default` en la base local QA.

- Estado inicial esperado: `tax_rate` y `tax_mode` nulos.
- Estado temporal probado: tasa `18.00`, modalidad `INCLUDED`.
- Estado final exigido: restauración de ambos campos a `NULL` mediante la interfaz de SUPERADMIN.
- No se configura una tasa comercial definitiva para Jean ni se usa Neon.
- La prueba conserva el pedido histórico sin configuración para verificar que el snapshot no cambia cuando cambia la configuración actual.
