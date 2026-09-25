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

## Resultado global B - historico, reemplazado por el addendum R2

## Addendum R2 - ejecucion real de 17-R2 (2026-09-24)

Este addendum corrige la cobertura historica de la tabla anterior. Los escenarios indicados abajo se ejecutaron con mutacion real desde la UI cuando fue posible; los bloqueos se conservaron como bloqueos y no se sustituyeron por pruebas de contrato.

### Alcance y metodo

- Worktree: `C:\Users\jean_\Desktop\COLDPOWER-wt17b`; sin commit y sin cambios en el codigo de la app.
- Servidor: `localhost:3004` exclusivamente, iniciado por rol con `CP_DEV_AUTH_ALLOWED_HOSTS=localhost:3004`; todas las navegaciones usaron `http://localhost:3004`.
- Base: PostgreSQL 18 local en `127.0.0.1:5433`, usando `.env.localdb` y `C:\PostgreSQL\18\bin\psql.exe`; nunca Neon.
- Browser: Playwright Chromium headless desde `.qa-runtime/node_modules`, viewport `1920x1080`, `deviceScaleFactor=1`.
- Scripts reproducibles creados en [`scripts/qa`](../../../scripts/qa/): `b-1-1-quote.mjs`, `b-1-4-discount.mjs`, `b-2-3-payments.mjs`, `b-3-3-receiving.mjs`, `b-3-4-adjustment.mjs`, `b-4-1-purchase-flow.mjs`, `b-7-1-users.mjs`, `b-7-2-company-settings.mjs`, `b-7-3-product-publication.mjs` y `b-helpers.mjs`.

### Resultado de los recorridos exigidos

| Recorrido | Resultado real | Evidencia principal |
|---|---|---|
| B1.1 Cotizacion a venta | COMPLETADO | Se creo cotizacion publica `CP-20260924-YD5P`, se edito, envio, respondio, acepto y convirtio a venta desde UI; SQL antes/despues y capturas 01-13 en [`B1.1-quote-to-sale`](../evidencia/17r2-staff/B1.1-quote-to-sale/). |
| B1.4 / B2.1 Descuento y aprobacion | BLOQUEADO_UI_CONTRACT | GERENCIA creo por UI una regla valida 10/10 y se creo una cotizacion real, pero el drawer no renderiza controles de descuento y guarda solo producto/cantidad, vigencia, impuestos y nota. No se invento una aprobacion por API. Evidencia en [`B1.4-B2.1-discount-approval`](../evidencia/17r2-staff/B1.4-B2.1-discount-approval/). |
| B2.3 / B5.1 Pagos y reembolso | COMPLETADO | Checkout, pago manual, doble intento de reembolso, cancelacion del proveedor, aprobacion tardia y cola de reembolso ejecutados por UI; SQL de cada estado en [`B2.3-B5.1-payments`](../evidencia/17r2-staff/B2.3-B5.1-payments/). |
| B3.3 Recepcion | BLOQUEADO_UI_RUNTIME | Se abrio recepcion, selecciono una linea y se intento registrar la cantidad; el submit fallo con `TypeError` antes de persistir. No se atribuyo una recepcion inexistente. Evidencia en [`B3.3-partial-receiving`](../evidencia/17r2-staff/B3.3-partial-receiving/). |
| B3.4 Ajuste por conteo | COMPLETADO | ALMACEN registro dos ajustes reales durante la depuracion, ambos con motivo y lectura posterior de Kardex; para `CP-ROT-8284` en Lima el saldo termino en `on_hand=19`, `reserved=4`. Evidencia en [`B3.4-inventory-count`](../evidencia/17r2-staff/B3.4-inventory-count/). |
| B4.1 Solicitud a orden de compra | PARCIAL / BLOQUEADO_UI_RUNTIME | COMPRAS creo proveedor y solicitud; JEFATURA aprobo la solicitud por UI y SQL. La conversion a OC fallo al introducir costo unitario, por lo que no se reporta una OC creada. Evidencia en [`B4.1-purchase-flow`](../evidencia/17r2-staff/B4.1-purchase-flow/). |
| B7.1 Usuarios y auditoria | PARCIAL / BLOQUEADO_UI_EXTERNAL_SYNC | SUPERADMIN creo una invitacion valida (`201`) y la cancelo por UI. El cambio de rol del fixture local devolvio `502`: el usuario no existe en Clerk, quedo `REPORTES`, `clerk_sync_status=PENDING` y error `Not Found`. La verificacion suplementaria con un fixture VENTAS existente demostro denegacion de configuracion/usuarios por URL y API. Evidencia en [`B7.1-users-role-audit`](../evidencia/17r2-staff/B7.1-users-role-audit/). |
| B7.2 Empresa y restauracion | COMPLETADO | SUPERADMIN cambio el nombre temporalmente y restauro el valor original: versiones `5 -> 6 -> 7`, con historial y SQL. Evidencia en [`B7.2-company-settings-restore`](../evidencia/17r2-staff/B7.2-company-settings-restore/). |
| B7.3 Producto, foto y publicacion | COMPLETADO | SUPERADMIN oculto, asocio por UI una imagen propia, publico mediante preflight/PATCH real, verifico la ficha publica con `/api/media/...`, despublico y dejo el producto oculto. Producto: `CP-REF-TAR-0810`, slug `tarjeta-lg-con-cable-6871jb1103h`. VENTAS no vio boton de publicar y recibio `403` en preflight/PATCH. Evidencia en [`B7.3-product-media-publication`](../evidencia/17r2-staff/B7.3-product-media-publication/), usando [`result-run.json`](../evidencia/17r2-staff/B7.3-product-media-publication/result-run.json) y [`result-prohibited.json`](../evidencia/17r2-staff/B7.3-product-media-publication/result-prohibited.json). |

### Defectos y causas raiz reproducidas

1. **P1 - B1.4/B2.1, contrato UI incompleto.** El drawer de edicion envia `items` con `productId` y `quantity`, `validUntil`, `taxMode` y `message`, pero no ofrece `discountPercentage` ni `discountReason` ([`QuotesWorkspace.tsx:2363-2406`](../../../src/components/admin/QuotesWorkspace.tsx:2363)). El parser de servidor si acepta esos campos cuando llegan ([`quote-service.ts:294-302`](../../../src/lib/quote-service.ts:294)). Resultado: se puede configurar la regla, pero no solicitar ni aprobar el descuento desde el recorrido pedido. Adicionalmente, un intento inicial con umbral 20 y maximo 10 fue rechazado por la restriccion de base; la validacion de dominio exige precisamente umbral <= maximo ([`pricing-validation.ts:33-40`](../../../src/lib/pricing-validation.ts:33)).
2. **P1 - B3.3, runtime al registrar recepcion.** El setter de cantidades lee `event.currentTarget.value` dentro del updater funcional ([`PurchasesOperations.tsx:891`](../../../src/components/admin/PurchasesOperations.tsx:891)); al pulsar Registrar, el evento ya no esta disponible y el Error Boundary mostro `Cannot read properties of null (reading 'value')`. La captura `error.png`, `browser-events.json` y `sql-before.tsv` prueban que la mutacion no se completo.
3. **P1 - B4.1, runtime al convertir solicitud.** El costo por linea usa `event.currentTarget.value` dentro del updater funcional ([`PurchaseRequestActions.tsx:181`](../../../src/components/admin/PurchaseRequestActions.tsx:181)); el intento de conversion produjo el mismo `TypeError` antes de crear `purchases`/`purchase_items`. La evidencia esta en `error-convert.png`, `error-convert.json` y `sql-after-approval.tsv`.
4. **P1 - B7.1, sincronizacion externa no disponible para el fixture.** La ruta intenta `setUserRole`, registra `clerkSyncStatus=PENDING` y responde `502` cuando Clerk no confirma el cambio ([`usuarios/[id]/route.ts:42-61`](../../../src/app/api/admin/usuarios/[id]/route.ts:42)). La causa concreta fue el ID de fixture local `cp-dashboard-v5-user-staff-016`, inexistente en el tenant Clerk usado por el entorno; no se falsifico el resultado modificando SQL directamente.

### Artefactos y conclusion

Cada carpeta de escenario contiene `result*.json`, capturas PNG, eventos de navegador y consultas TSV. El informe demuestra que la pasada anterior no era suficiente: en esta ejecucion se intentaron por UI todos los escenarios exigidos y cada uno se llevo hasta su mutacion completa o hasta un bloqueo reproducible con evidencia de causa raiz. El estado global no es una aprobacion limpia por los bloqueos B1.4/B2.1, B3.3, B4.1 y B7.1; tampoco se modifico codigo de produccion ni se hizo commit.
