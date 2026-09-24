# B — QA final local de personal y RBAC

Fecha: 2026-09-24  
Base: PostgreSQL 18 local en `127.0.0.1:5433`, `.env.localdb`; nunca Neon.  
Servidor QA: build servido en `3003`, bypass de desarrollo reiniciado por rol.  
Cobertura de roles: VENTAS, OPERACIONES_VENTAS, REPORTES, JEFATURA, ALMACEN, COMPRAS, GERENCIA, ADMIN y SUPERADMIN.

## Método

Se verificaron aterrizajes por rol, rutas permitidas y denegaciones por URL/API directa. Se cargó la fixture idempotente visual 2026 para comprobar dashboard/reportes y se ejecutó un flujo real de fulfillment hasta entrega. Las capturas son smoke visual y no sustituyen las mutaciones que figuran como no ejecutadas.

La denegación de los probes de cliente a `/api/admin/usuarios`, `/api/admin/configuracion` y `/api/admin/pagos` fue 403 esperado; sus mensajes aparecen como errores de consola por diseño del probe y no como fallo de autorización.

## Escenarios B

| Escenario | Resultado | Evidencia y recorrido | Factores D cubiertos | Severidad / archivo:línea |
|---|---|---|---|---|
| B1.1 Atender solicitud web | ❌ | Se verificaron landing, CRM y cotizaciones por VENTAS/OPERACIONES_VENTAS y se creó una cotización pública, pero no se completó en navegador el ciclo notificación → precios → respuesta → conversión a venta/pedido. Capturas: [`qa-final-b1-ventas-landing-1920x1080.png`](capturas/qa-final-b1-ventas-landing-1920x1080.png), [`qa-final-b1-quotes-superadmin-1920x1080.png`](capturas/qa-final-b1-quotes-superadmin-1920x1080.png). | Roles; deep-link; cotización persistida; estados; permisos de módulo. | P1 cobertura pendiente; —. |
| B1.2 Seguimiento del día | ❌ | El módulo de operaciones aterrizó correctamente, pero no se completó una actividad y se verificó su desaparición de la cola. Captura: [`qa-final-b1-operaciones-ventas-1920x1080.png`](capturas/qa-final-b1-operaciones-ventas-1920x1080.png). | OPERACIONES_VENTAS; estados vacíos; cola; acción idempotente. | P2 cobertura pendiente; —. |
| B1.3 Cliente 360 | ❌ | Se comprobó acceso al módulo CRM y sus contratos, pero no se ejecutó búsqueda por teléfono con saltos a cotización, venta, pedido y pago. Captura: [`qa-final-b1-admin-ventas-1920x1080.png`](capturas/qa-final-b1-admin-ventas-1920x1080.png). | RBAC; filtros server-side; links entre módulos; volumen. | P2 cobertura pendiente; —. |
| B1.4 Descuento | ❌ | No se hizo la solicitud sobre umbral, bloqueo ni aprobación posterior. | Umbral; aprobación; notificación; permisos; auditoría. | P1 cobertura de control financiero pendiente; —. |
| B2.1 Aprobar descuento | ❌ | GERENCIA aterriza en dashboard y tiene rutas esperadas, pero no se procesó una aprobación desde notificación/drawer. Captura: [`qa-final-b5-gerencia-dashboard-1920x1080.png`](capturas/qa-final-b5-gerencia-dashboard-1920x1080.png). | GERENCIA; autorización; estado; auditoría. | P1 cobertura pendiente; —. |
| B2.2 Lectura del negocio | ✅ con hallazgo de fixture | Dashboard, reportes, filtros, métricas y moneda cargaron con la fixture local; las consultas SQL no encontraron desbalances monetarios ni invariantes rotas. La fixture contiene cuatro pedidos `READY_FOR_PICKUP` con pago `UNDER_REVIEW`, combinación que debe corregirse antes de usarla como dato demostrativo. Captura: [`qa-final-b5-gerencia-dashboard-1920x1080.png`](capturas/qa-final-b5-gerencia-dashboard-1920x1080.png). | GERENCIA; volumen; rangos; moneda; datos vacíos/llenos; dashboard/reportes. | P2 fixture inconsistente: [`seed-visual-year.ts`](../../scripts/seed-visual-year.ts:131). |
| B2.3 Reembolso | ❌ | No se procesó una devolución desde “Por reembolsar”; solo se comprobó acceso de GERENCIA a pagos y los contratos de dominio. | GERENCIA; pago; devolución; idempotencia; auditoría. | P1 cobertura financiera pendiente; —. |
| B3.1 Preparar pedido | ✅* | Se validó el flujo real paid → preparación → picking → listo → entrega → seguimiento → entregado y la consistencia SQL; la mutación operativa se ejecutó con SUPERADMIN y la matriz de rutas de ALMACEN fue probada por smoke. Capturas: [`qa-final-b3-almacen-inventario-1920x1080.png`](capturas/qa-final-b3-almacen-inventario-1920x1080.png), [`qa-final-c2-delivered-1920x1080.png`](capturas/qa-final-c2-delivered-1920x1080.png). | ALMACEN/SUPERADMIN; reserva; estados; cantidad; shipment; doble acción; permisos. | P2 de actor exacto: repetir mutación con ALMACEN puro; pagos no quedaron visibles en sus rutas. |
| B3.2 Críticos | ❌ | Se cargó inventario por ALMACEN, pero no se creó una solicitud de compra desde el crítico del local. Captura: [`qa-final-b3-almacen-inventario-1920x1080.png`](capturas/qa-final-b3-almacen-inventario-1920x1080.png). | ALMACEN; local; stock crítico; solicitud; volumen. | P2 cobertura pendiente; —. |
| B3.3 Recibir traslado/compra | ❌ | Los contratos de recepción e idempotencia pasaron, pero no se hizo la recepción por líneas en UI ni se probó doble clic real. | ALMACEN; recepción parcial; doble acción; Kardex; concurrencia. | P1 cobertura operativa pendiente; —. |
| B3.4 Ajuste por conteo | ❌ | No se registró un ajuste con motivo ni se releyó el Kardex en navegador. | ALMACEN; motivo; auditoría; Kardex; cantidad límite. | P1 cobertura operativa pendiente; —. |
| B4.1 Convertir solicitud en OC | ❌ | COMPRAS aterriza en su módulo y el inventario/purchases responde, pero no se convirtió una solicitud con costos por línea ni se siguió un retraso. Captura: [`qa-final-b4-compras-1920x1080.png`](capturas/qa-final-b4-compras-1920x1080.png). | COMPRAS; costos; proveedor; estados; idempotencia. | P1 cobertura pendiente; —. |
| B4.2 Gasto por proveedor/moneda | ❌ | No se ejecutó una lectura de gasto por proveedor separando PEN/USD. Captura de contexto: [`qa-final-b4-compras-1920x1080.png`](capturas/qa-final-b4-compras-1920x1080.png). | COMPRAS; dos monedas; filtros; rango; exportación. | P2 cobertura pendiente; —. |
| B5.1 Caja/pagos | ❌ | No se conciliaron pagos pendientes ni se registró pago manual y devolución manual en la UI. La matriz de autorización y los contratos de pagos pasaron. Captura: [`qa-final-b5-gerencia-dashboard-1920x1080.png`](capturas/qa-final-b5-gerencia-dashboard-1920x1080.png). | Payments; monto editable; moneda; devolución; auditoría; idempotencia. | P1 cobertura financiera pendiente; —. |
| B6.1 Reporte programado | ❌ parcial | REPORTES aterriza correctamente, exporta/filtra y aceptó un POST de programación semanal (`QA reporte semanal local`, ACTIVE). No se ejecutó el job semanal ni apareció automáticamente sin refrescar; la UI requirió refresh para reflejar el registro. Captura: [`qa-final-b6-reportes-1920x1080.png`](capturas/qa-final-b6-reportes-1920x1080.png). | REPORTES; fecha Lima; rango/moneda; persistencia; feedback; job. | P2: falta feedback de actualización/ejecución en esta prueba; [`ReportScheduleControls.tsx`](../../src/components/admin/ReportScheduleControls.tsx:90). |
| B7.1 Usuarios y auditoría | ❌ | SUPERADMIN cargó usuarios, pero no se completó invitación → cambio de rol → auditoría en un solo recorrido. Captura: [`qa-final-b7-admin-superadmin-1920x1080.png`](capturas/qa-final-b7-admin-superadmin-1920x1080.png). | SUPERADMIN; permisos; confirmación; auditoría; deep-link. | P1 cobertura pendiente; —. |
| B7.2 Empresa/restauración | ❌ | No se cambió un dato de empresa y se restauró una versión anterior desde la UI. | SUPERADMIN; concurrencia; historial; restauración; auditoría. | P1 cobertura pendiente; —. |
| B7.3 Producto y foto | ❌ | No se publicó/despublicó un producto con foto propia ni se revalidó su aparición en tienda. El CMS permaneció oculto y no fue tocado. | SUPERADMIN; publicación; media; caché; catálogo público. | P1 cobertura pendiente; —. |

## RBAC y controles confirmados

- SUPERADMIN cargó todos los módulos esperados.
- ADMIN, VENTAS, REPORTES, JEFATURA, ALMACEN, COMPRAS, GERENCIA y OPERACIONES_VENTAS aterrizaron en su inicio permitido y recibieron 403/redirect en rutas fuera de su permiso.
- Cliente recibió 403 en usuarios, configuración y pagos administrativos.
- Los contratos de dominio de cotizaciones, ventas, pedidos, pagos, inventario, compras, operaciones, reportes, auditoría y configuración pasaron en los grupos ejecutados.
- El flujo real de entrega terminó con `DELIVERED`, pago `CONFIRMED`, shipment `DELIVERED`, reserva `CONSUMED`, cantidad preparada 1 y `on_hand=1312`, `reserved=0`.

## Hallazgos y pendientes

- P0 observados: ninguno.
- P1 de cobertura: conversión comercial, descuentos, reembolso, recepción/ajuste de almacén, compras y publicación de producto no tienen una mutación UI completa demostrada.
- P2 confirmado: reporte programado aceptado pero feedback de lista dependiente de refresh; la fixture visual mezcla `READY_FOR_PICKUP` con `UNDER_REVIEW`.
- No se modificó el CMS oculto ni se crearon datos comerciales ficticios fuera de la fixture visual protegida.

## Resultado global B

La separación de roles y el flujo de fulfillment quedan respaldados por smoke de rutas, contratos y una entrega real local. La jornada completa de cada rol no queda aprobada: los escenarios marcados ❌ requieren una segunda pasada de mutaciones con el actor exacto y evidencia de auditoría.
