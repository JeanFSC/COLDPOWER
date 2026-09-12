# CP-036 — QA y entrega de Cotizaciones

## Identificación

- SHA histórico indicado por el ticket: `00ca8e2df7080c94de90d607ea8200e5bfd32066`.
- HEAD de trabajo: `df603525bfc9ebedbef15ec7238ae28e5d00a679`.
- Rama real: `main`; no se creó commit para preservar el worktree compartido.
- Ruta: `/admin/cotizaciones`.
- Referencia visual: `C:\Users\jean_\.codex\attachments\816f43dd-34ca-4c86-bc5a-c69dbf1c0fba\image-1.png`.

## Resultado implementado

Se reemplazó la bandeja duplicada por una workspace comercial con exactamente cuatro KPI, filtros persistidos en URL, búsqueda server-side, tabla desktop, cards mobile, rail de flujo/alertas, paginación, exportación, drawer de detalle de 620–760 px en desktop y pantalla completa en mobile. El drawer incluye Resumen, Precios, Actividad, Versiones e Historial, PDF on-demand, alta de borrador, edición de borrador y acciones gobernadas por estado y permiso.

Los únicos estados mostrados por la nueva UI son `DRAFT`, `SENT`, `FOLLOW_UP`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONVERTED` y `CANCELLED`, con labels en español y acciones contextuales. Los valores legacy permanecen sólo para compatibilidad y auditoría; `cerrada/cerrado` se conserva como cierre histórico no clasificable. Los filtros canónicos también encuentran registros históricos cuyo status legacy permite una clasificación segura.

## Dominio, persistencia y workflow

- `src/db/schema.ts` y `drizzle/0037_cp036_quote_versioning.sql` agregan modo tributario explícito (`INCLUDED`, `EXCLUDED`, `UNCONFIGURED`), revisionado, aceptación, ownership, moneda, totales, vigencia, envío, respuesta, aprobación de descuentos, `quote_versions`, `quote_version_items` y `quote_discount_approvals`.
- La migración es aditiva e idempotente y fue aplicada dos veces correctamente al PostgreSQL configurado en `.env.local`.
- `src/lib/quote-workflow.ts` concentra transiciones válidas, estado efectivo por vigencia, labels y acciones; no permite saltos como `FOLLOW_UP → CONVERTED`.
- `src/lib/quote-repository.ts` pagina y filtra en servidor por código, cliente, contacto, documento, SKU, producto, estado, responsable, moneda, fechas, vigencia, seguimiento y descuento. El detalle carga relaciones y versiones sólo al abrirlo; las métricas son globales, no dependen de la página.
- La tasa es `CONVERTED / (CONVERTED + REJECTED + EXPIRED) × 100`; `CANCELLED` queda fuera y el denominador cero muestra `N/D` con su tooltip explicativo.

## Pricing, descuentos y versiones

- `src/lib/quote-pricing.ts` valida una sola moneda por versión, calcula subtotal/descuento/impuestos/total y crea hash del snapshot.
- `src/lib/quote-service.ts` resuelve precios desde Pricing persistido, registra `priceType`, `priceSourceId` y motivo de precio manual cuando corresponde; no inventa precios ni usa `COST` como precio comercial.
- La preflight de envío bloquea producto sin precio, moneda faltante, tax mode ambiguo, vigencia inválida y descuento pendiente o sobre el máximo. Las solicitudes sobre umbral crean aprobación auditable con solicitante, monto, porcentaje, motivo, aprobador y fecha.
- Cada envío crea una versión inmutable; una nueva versión supersede la enviada anterior y abre un borrador nuevo. La aceptación sólo puede apuntar a la versión enviada vigente y la versión aceptada queda bloqueada.

## Envío, respuesta, CRM y PDF

- `/api/admin/cotizaciones/send` registra canal y evidencia; WhatsApp exige confirmación explícita de que el mensaje ya fue enviado, por lo que abrir un enlace no marca automáticamente la cotización como enviada.
- `/response`, `/follow-up` y `/version` persisten respuesta, motivo de rechazo, canal, seguimiento y nueva versión con historial funcional y `auditLogs` separados.
- El PDF se genera on-demand desde la versión actual/aceptada y no expone margen ni costo; el CSV conserva la exportación global filtrada y la auditoría PII.

## Conversión segura a venta

- `src/lib/quote-conversion-service.ts` sólo acepta `workflowStatus === ACCEPTED` y `acceptedVersionId` con estado `ACCEPTED`.
- Lee exclusivamente `quote_version_items`; no recibe precios, moneda, items ni total desde el request, no aplica promociones de nuevo y no asume PEN.
- En una única transacción bloquea cotización, versión, oportunidad, inventario y clave de idempotencia; valida stock, reserva, crea Sale/Order/Payment pendiente, actualiza Opportunity a `SALE`, conserva vendedor, deduplica cliente y registra historia/auditoría.
- Cualquier fallo revierte venta, pedido, reserva, cliente vinculado y estado de cotización. Requests repetidos devuelven la venta existente.
- La UI no pide precio unitario ni moneda durante conversión. Una aceptación histórica sin snapshot muestra `Requiere versión aceptada` y no ofrece un botón inválido.

## RBAC y seguridad de uso

La página exige `quotes.view`; creación, edición, envío, conversión y exportación se controlan por permisos server-side (`quotes.create`, `quotes.edit`, `quotes.send`, `quotes.convert`, `quotes.export`), y convertir además requiere `sales.manage`. Los componentes ocultan mutaciones no autorizadas, los endpoints repiten la autorización y las acciones críticas no usan `window.prompt()` ni `window.location.reload()`.

## Evidencia de navegador

Se verificó la sesión local autenticada en `http://localhost:3000/admin/cotizaciones` con datos reales del PostgreSQL configurado:

- La bandeja renderiza 80 registros, cuatro KPI, filtros, tabla y rail.
- El filtro canónico `ACCEPTED` devuelve sólo aceptadas históricas clasificables.
- El drawer carga cliente, productos, historial y las cinco pestañas.
- El drawer de alta muestra sólo clientes/productos remotos y bloquea guardar sin cliente.
- El panel de aceptación sin snapshot no muestra conversión insegura.
- En una pestaña limpia: 0 errores de consola; sólo warning normal de Clerk con claves de desarrollo. `document.scrollWidth` fue 1265 frente a viewport 1280, sin overflow global.

Capturas guardadas:

- `docs/qa/cp036-quotes-browser-1280x720.png`
- `docs/qa/cp036-quote-detail.png`
- `docs/qa/cp036-quote-create.png`

La URL `https://dev.coldpower.pe/admin/cotizaciones` redirigió a autenticación y no se intentó evadir el login. El navegador integrado disponible mantiene un viewport fijo de 1280×720, por lo que las capturas obligatorias exactas de 1440, 1024, 768 y 390 px quedan pendientes de una sesión con control de viewport o de que el usuario autentique/exponga el deployment de desarrollo. La implementación responsive sí está en código: tabla desde `md`, cards debajo de `md`, KPI 2×2 en `sm` y drawer mobile full-screen.

## Verificación automatizada

- `corepack pnpm test:cp036` — PASS, 5 tests.
- `corepack pnpm test:cp036:runtime` — PASS, 2 tests contra PostgreSQL.
- `corepack pnpm exec tsx --test scripts/catalog-view-model.test.ts scripts/compatibility-safety.test.ts` — PASS, 3 tests.
- `corepack pnpm exec tsx --test scripts/phase27-quote-workflow.test.mjs scripts/cp037-sales.test.mjs` — PASS, 4 tests.
- `corepack pnpm exec drizzle-kit check` — PASS.
- `corepack pnpm exec tsc --noEmit` — PASS.
- `corepack pnpm lint` — PASS con 14 warnings preexistentes fuera de CP-036.
- `corepack pnpm build` — PASS.
- `git diff --check` — PASS; sólo warnings de normalización LF/CRLF.
- `corepack pnpm test:inventory` — 19 PASS, bloqueado por falta del workbook externo `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`.
- `corepack pnpm test:all` — 62 PASS, 5 fallos contractuales preexistentes en CP-025/CP-027/taxonomía, sin relación con CP-036.

## Nota adicional

Durante la pasada final TypeScript detectó un fragmento JSX sin padre en el `PipelineWorkspace` existente y se corrigió con un fragmento React, además de ocultar opciones stale cuando el filtro remoto tiene menos de dos caracteres. No se modificó su dominio ni su flujo.

## Estado QA

La implementación local y el contrato comercial están listos. El único bloqueo restante para declarar QA completo del ticket es el acceso autenticado a `dev.coldpower.pe` y la captura de los cuatro anchos exactos solicitados.

final result: blocked
