# CP-025 — diseño de estabilización del núcleo

Fecha: 2026-08-11
Estado: aprobado para implementación inline por el ticket del usuario

## Decisiones no negociables

1. La publicación comercial será un estado editorial explícito: `draft`, `review`, `published` o `hidden`. El estado `products.status` actual se conserva como estado de origen y no autoriza publicación.
2. La importación existente de 1,348 productos no se repite. La migración CP-025 agrega gobernanza y deja los registros existentes en `review`; ningún registro se publica automáticamente.
3. `CP-REF-OTR-0435` queda en revisión con la razón `Descripción insuficiente` y no entra a homepage, búsqueda pública, sitemap, recomendaciones ni URLs indexables.
4. La disponibilidad inicial es `unknown` y se muestra como `Consultar disponibilidad`. La ausencia de existencias no significa `Bajo pedido`.
5. No se inventan cantidades, almacenes, precios, contactos, RUC ni ubicaciones. Si el Excel/ACSOFT no trae cantidad y ubicación, el importador de stock solo informa que no puede aplicar.
6. Las operaciones de inventario serán transaccionales y generarán kardex. El saldo disponible se deriva de `on_hand - reserved`.
7. El catálogo público consulta únicamente productos publicados que superen los bloqueos editoriales. El panel administrativo consulta todo el catálogo y permite revisión autorizada sin borrado físico.

## Arquitectura

- `products`: campos editoriales, disponibilidad y auditoría de publicación.
- `company_settings`: configuración comercial nullable; mientras no exista información real, la UI oculta el campo.
- `locations`, `inventory_balances`, `inventory_movements`: base de inventario y kardex.
- `inventory_import_batches`: trazabilidad de futuras importaciones.
- `transfers`, `transfer_items`: traslados con ciclo de aprobación/recepción.
- `inventory_reservations`: reservas independientes de cotizaciones.
- `audit_logs`: cambios editoriales, inventario, transferencias, roles y clasificación.

## Reglas de publicación

Un producto público debe cumplir simultáneamente: `publication_status = published`, origen activo, `requires_review = false`, `possible_duplicate = false`, categoría/familia válidas y descripción editorial suficiente. Los cambios de estado pasan por un servicio autorizado y registran actor, fecha, estado anterior/nuevo y nota. No existe endpoint de borrado físico.

## Reglas de inventario

Cada combinación producto/ubicación es única. `on_hand` y `reserved` nunca son negativos y `reserved <= on_hand`. Ajustes, recepciones, ventas futuras, reservas, liberaciones, consumos y transferencias se escriben dentro de transacciones con movimiento de kardex. Las reservas no se conectan automáticamente a cotizaciones en CP-025.

## Rollback

La migración es aditiva y reversible mediante una migración de rollback documentada. Antes de aplicarla se ejecuta `db:backup`, que genera un JSON lógico sin secretos de las tablas actuales bajo `tmp/backups/`. El archivo de respaldo queda fuera de rutas públicas y contiene conteos y filas necesarias para reconstrucción.

## Fuera de alcance

Facturación, SUNAT, ventas reales, precios completos, compras, API de WhatsApp, dashboard ejecutivo y ejecución de importación de stock sin cantidades/ubicaciones verificadas.

## Datos comerciales pendientes del propietario

Razón social, nombre comercial, RUC, dirección y ubicaciones, teléfonos, WhatsApp, correo, horario, redes sociales, URL de términos/privacidad y datos del libro de reclamaciones. Hasta recibirlos, los campos permanecen ocultos.
