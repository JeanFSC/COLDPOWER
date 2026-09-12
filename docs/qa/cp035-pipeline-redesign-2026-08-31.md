# CP-035 — QA del rediseño de Pipeline de oportunidades

Fecha: 2026-08-31  
Ruta: `/admin/crm`  
Referencia visual: `C:\Users\jean_\.codex\attachments\85428ec9-5458-4529-b97d-71b59df9a2a9\image-1.png`  
SHA histórico indicado por el ticket: `00ca8e2df7080c94de90d607ea8200e5bfd32066`  
SHA final verificado: `df603525bfc9ebedbef15ec7238ae28e5d00a679` (cambios sin commit sobre `main`)

## Resumen ejecutivo

Se reconstruyó el workspace comercial alrededor de seis macroetapas: Nuevas, Contactadas, Cotización, Seguimiento, Negociación y Ganadas. El board ahora separa ventas de operación postventa, pagina por lane, agrega métricas globales sin depender de la página visible, mantiene PEN/USD separados, corrige la semántica de `lastContactAt`/`followUpAt` y conserva auditoría, historial, RBAC y persistencia transaccional.

La interfaz se validó en el navegador integrado con datos persistidos locales y un bypass temporal exclusivamente de desarrollo. La instancia remota `https://dev.coldpower.pe/admin/crm` redirigió a autenticación, por lo que no se pudo validar allí con una sesión real. El bypass fue restaurado en `.env.local` después de la QA.

## Arquitectura y superficies modificadas

- Contrato y repository: `src/lib/pipeline-contract.ts`, `src/lib/pipeline-repository.ts`, `src/lib/opportunity-stage-config.ts`.
- Dominio CRM: `src/lib/crm-validation.ts`, `src/lib/crm-service.ts`.
- UI: `src/components/admin/PipelineWorkspace.tsx`, `src/components/admin/AdminDrawer.tsx`, `src/app/admin/crm/page.tsx`, `src/app/globals.css`.
- API: `src/app/api/admin/oportunidades/route.ts`, `src/app/api/admin/oportunidades/[id]/route.ts`, follow-ups y exportación.
- Integración de cotizaciones: `src/lib/quote-service.ts`, `src/components/admin/QuotesWorkspace.tsx`, `src/app/admin/cotizaciones/page.tsx`.
- Tests: `scripts/cp035-pipeline.test.mjs`, `scripts/cp035-domain.test.ts`, `scripts/cp035-runtime-data.test.ts`.
- Schema/migrations: no se requirió migración nueva; se reutilizaron `opportunities`, `opportunityItems`, `opportunityStageHistory`, `opportunityFollowups`, `crmActivities`, `crmTasks`, `quotes` y `auditLogs` existentes.

## Matriz de 50 requisitos

| # | Requisito | Estado | Evidencia / nota |
|---:|---|---|---|
| 1 | Fuente visual seleccionada | PASS | Se inspeccionó la imagen adjunta y se reutilizó el lenguaje visual del admin ColdPower. |
| 2 | Ruta `/admin/crm` | PASS | La página server-side monta `PipelineWorkspace` para la vista pipeline. |
| 3 | Seis macroetapas | PASS | `NEW`, `CONTACTED`, `QUOTING`, `FOLLOW_UP`, `NEGOTIATION`, `WON`. |
| 4 | Mapping de estados reales | PASS | Cotización agrupa `QUOTING` + `QUOTE_SENT`; Ganadas agrupa `ACCEPTED` + `SALE`. |
| 5 | Postventa fuera del board | PASS | `PAYMENT_PENDING`, `PAID`, `PREPARING`, `DELIVERED`, `CLOSED` no son lanes comerciales. |
| 6 | Cerradas/perdidas secundaria | PASS | `CLOSED`, `LOST`, `CANCELLED`, `NO_RESPONSE` se consultan desde la vista Cerradas. |
| 7 | Header y CTAs | PASS | Título “Pipeline de oportunidades”, descripción comercial, Exportar y Nueva oportunidad. |
| 8 | Cuatro KPI | PASS | Activas, Valor del pipeline, Seguimientos vencidos y Tasa de cierre. |
| 9 | Activas sin ventas convertidas | PASS | Métricas activas excluyen `SALE` y estados terminales/postventa. |
| 10 | Multimoneda | PASS | Importes agrupados por moneda; no se suma PEN con USD. |
| 11 | Probabilidades centralizadas | PASS | Configuración en `opportunity-stage-config.ts`; permanece `configured: false`. |
| 12 | No forecast falso | PASS | Se sustituye el KPI ponderado por Seguimientos vencidos mientras no exista aprobación comercial. |
| 13 | Tasa de cierre honesta | PASS | `CLOSED / (CLOSED + LOST + CANCELLED)` y `N/D` sin denominador. |
| 14 | KPI clickables | PASS | Cada KPI navega a Pipeline, filtro con monto, Seguimientos vencidos o Cerradas. |
| 15 | Tooltip KPI | PARTIAL | El KPI de vencidos explica su fuente; los demás usan helper visible, sin tooltip individual completo. |
| 16 | Búsqueda server-side | PASS | Código, título, cliente, email, teléfono, producto, SKU, categoría y familia. |
| 17 | Filtros principales | PASS | Etapa, vendedor, origen, moneda y Más filtros. |
| 18 | Filtros avanzados | PASS | Cliente, producto, fechas de creación/seguimiento, vencidos, sin acción, cotización y monto. |
| 19 | Filtros en URL/chips | PASS | Refresh y back conservan el query; chips remueven filtros individualmente. |
| 20 | Vendedores válidos | PASS | Facet server-side de usuarios activos con roles comerciales compatibles. |
| 21 | Counts globales | PASS | Métricas y total de cada lane se calculan fuera de la página visible. |
| 22 | Paginación por lane | PASS | Cada lane usa `page/pageSize`, `limit/offset` y `hasMore`. |
| 23 | Sin N+1 | PASS | Clientes, vendedores, items y seguimientos se resuelven en joins/batches. |
| 24 | Card comercial | PASS | Código, cliente, título, importe, productos, vendedor, acción, follow-up y aging. |
| 25 | Máximo dos productos | PASS | Card muestra dos líneas y contador adicional cuando aplica. |
| 26 | Valor desconocido | PASS | Se muestra “Valor por definir”, no `S/ 0`. |
| 27 | Responsable | PASS | Avatar inicial, nombre o “Sin responsable” con señal visual. |
| 28 | Aging correcto | PASS | Se calcula desde `lastContactAt`, nunca desde `followUpAt`. |
| 29 | Thresholds centralizados | PASS | Neutral 0–2, atención 3–5 y alerta 6+ en configuración de etapa. |
| 30 | Follow-up autoritativo | PASS | Vencidos se consultan desde `opportunityFollowups`; snapshot se refresca al mutar. |
| 31 | Actividad de contacto | PASS | CALL, WHATSAPP, EMAIL y MEETING actualizan último contacto cuando corresponde. |
| 32 | NOTE/TASK/stage no falsean contacto | PASS | No actualizan `lastContactAt`. |
| 33 | Drag & drop seguro | PASS | Destino se valida en frontend y vuelve a validarse en `changeOpportunityStage`. |
| 34 | Alternativa accesible al drag | PASS | Cada card tiene combobox “Cambiar etapa”. |
| 35 | Seguimiento con datos requeridos | PASS | Etapa Seguimiento pide próxima acción, fecha y nota. |
| 36 | Pérdida con motivo | PASS | Modal estructurado con Precio, Sin stock, Competencia, No respondió, Proyecto cancelado, Condiciones comerciales y Otro. |
| 37 | Cancelación auditada | PASS | Motivo obligatorio, persistido con history y audit log. |
| 38 | Sin respuesta | PARTIAL | El contrato acepta intentos/reintento y los audita, pero la UI aún no muestra un editor específico para esos campos. |
| 39 | Aceptada validada | PASS | Requiere responsable, monto, moneda y producto. |
| 40 | SALE explícita | PASS | El drag/manual stage change bloquea SALE y remite a conversión de cotización/venta. |
| 41 | Timeline unificado | PASS | Activities actuales y legacy se normalizan en una sola timeline visible. |
| 42 | Drawer de detalle | PASS | Resumen, Productos, Actividad, Seguimientos, Cotizaciones e Historial. |
| 43 | Seguimientos operables | PASS | Completar, cancelar y reprogramar desde el drawer; snapshot se mantiene consistente. |
| 44 | Integración de cotización | PASS | El drawer abre `/admin/cotizaciones?opportunityId=...`, precarga cliente/productos y envía el vínculo al servicio. |
| 45 | Items, cantidades y total | PASS | IDs seleccionados se consultan server-side; cantidades, moneda y total se validan y guardan. |
| 46 | Exportación | PASS | CSV auditado y respeta el alcance de filtros, recorriendo todas las páginas. |
| 47 | RBAC | PASS | `crm.view`, `crm.manage` y `crm.export` controlan lectura, mutaciones y exportación. |
| 48 | Auditoría/notificaciones | PASS | Stage history es inmutable; mutaciones se auditan y vencidos usan notificación deduplicada. |
| 49 | Loading/error/empty | PARTIAL | Hay estados de carga y vacíos; el error de carga server-side depende de la boundary de la ruta y no de un panel inline específico del board. |
| 50 | Responsive, browser QA y evidencia | PARTIAL | DOM verificado a 1440/1024/768/390 y flujos principales operativos; no se pudieron guardar PNGs obligatorios ni probar el remoto sin sesión. |

## Verificación automatizada

- `corepack pnpm test:cp035` — PASS (3 tests).
- `corepack pnpm test:cp035:runtime` — PASS (2 tests, PostgreSQL/Neon, lectura sin mutación).
- `corepack pnpm exec tsx --test scripts/catalog-view-model.test.ts scripts/compatibility-safety.test.ts` — PASS (3 tests).
- `corepack pnpm exec tsc --noEmit` — PASS.
- `corepack pnpm lint` — PASS, 0 errores y 14 warnings preexistentes fuera del módulo.
- `corepack pnpm build` — PASS.
- `git diff --check` — PASS.
- `corepack pnpm test:inventory` — BLOCKED por ausencia del workbook requerido `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`; 19 tests pasan antes del único fallo de archivo faltante.

## Browser QA y comparación visual

Se verificó en el navegador integrado usando el preview local en `http://localhost:3000/admin/crm`:

- 1440×900, 1024×800, 768×900 y 390×844: carga del heading, seis lanes en desktop y selector de lane móvil.
- Filtros avanzados: cliente, producto, fechas, cotización, monto, vencidos y chips.
- Tabs: Pipeline, Seguimientos y Cerradas; el query se conserva en URL.
- Drawer de nueva oportunidad: cliente, título, origen, moneda, responsable, monto, productos, acción, fecha y notas.
- Detalle: productos con SKU/cantidad/importe, timeline, actividades, follow-ups y acciones rápidas.
- Pérdida: modal con catálogo de motivos y detalle.
- Cotización: drawer precargado desde oportunidad existente, sin enviar una mutación de prueba.
- Consola estable: sin errores propios; sólo warnings de claves Clerk de desarrollo. Durante el formateo hubo errores transitorios de hot reload que desaparecieron tras la carga estable.
- Scroll: a 1024 el overflow horizontal queda contenido en el board (`overflow-x-auto`), sin fuga visual de la página.

La composición final conserva la referencia: shell blanco, canvas azul-gris, jerarquía navy, azul primario, CTA naranja, cuatro KPI compactos, filtros densos, board de seis columnas y cards con metadata comercial. La diferencia deliberada es que el mock visual se adapta a los estados reales y a la macroetapa de seis columnas solicitada por el ticket.

## Blockers y resultado

1. No existe una sesión autenticada reutilizable para `https://dev.coldpower.pe`; el remoto redirige a sign-in.
2. El navegador integrado no expuso una captura descargable local para generar los ocho archivos PNG obligatorios; no se fabricaron screenshots.
3. `test:inventory` requiere un workbook externo ausente; no se inventó ni se sustituyó.
4. QA de `NO_RESPONSE`, error inline del board y evidencia PNG quedan como seguimiento recomendado.

Resultado CP-035: **implementación funcional PASS; cierre documental PARTIAL por bloqueos externos de autenticación, screenshots y workbook de inventario**.
