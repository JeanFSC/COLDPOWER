# Auditoría Clientes, Pipeline/CRM y Cotizaciones — 2026-09-22

> Auditoría de código (lectura) contra GOAL-IMPECABLE §4. Hallazgo más grave: **Cotizaciones Q1/Q2** — el drawer llama rutas que no existen; hoy no se puede enviar, responder, dar seguimiento, versionar ni cancelar una cotización desde la UI.

# Auditoría Clientes
Rutas: /admin/clientes, /admin/crm?view=clientes (segunda UI legacy) · Componentes: CustomersControlCenter, CustomerDetailPanel, CustomersWorkspace (AdminCategoryViews.tsx:1179) · Servicios: customer-repository.ts, customer-operations-service.ts, crm-service.ts · Tablas: customers, customer_contacts/addresses/notes, customer_quote_links, crm_attachments · Roles: VENTAS, GERENCIA, OPERACIONES_VENTAS, SUPERADMIN

## Tarea del usuario
Ventas busca al cliente, ve su 360, salta a sus cotizaciones/ventas/pedidos y registra actividad. Ventas y gerencia fusionan duplicados (la mayoría vienen de la web).

## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| C1 | P1 | Datos | crm-service.ts:347,349 | Un lead web solo coincide si email **y** teléfono son iguales; sin email compara con `""` → cada solicitud crea un PROSPECT nuevo. Ignora documento y userId. | Coincidir por userId → documento/RUC → teléfono o email normalizados. |
| C2 | P1 | Datos | customer-operations-service.ts:102-114 | La fusión no mueve `crm_attachments` ni `customers.userId`. | Mover todas las FK y el userId en la misma transacción. |
| C3 | P2 | Datos | customer-operations-service.ts:94-97 | Se puede fusionar en un cliente ya fusionado (cadenas). | Rechazar si alguno tiene `canonicalCustomerId`. |
| C4 | P2 | Enlaces | CustomerDetailPanel.tsx:722-736 | En el 360, cotizaciones/oportunidades/ventas/pedidos/pagos son texto; cotizaciones muestran el nombre del cliente; sin montos. | Cada fila enlaza a su módulo filtrado con código, estado y total. |
| C5 | P2 | UI/Función | crm/page.tsx:19-35; AdminCategoryViews.tsx:1179-1324 | Dos UIs de clientes; la legacy sin permisos y con "Nuevo cliente" roto. | Redirigir `/admin/crm?view=clientes` a `/admin/clientes` y borrar `CustomersWorkspace`. |
| C6 | P2 | Roles | CustomersControlCenter.tsx:504-510 | "Exportar" visible para VENTAS sin permiso → 403. | Mostrar solo con `customers.export`. |
| C7 | P2 | Rendimiento | customer-repository.ts:621,658,752,772,781 | `getCustomer360`: 5 rondas secuenciales. | 2 rondas con `Promise.all`. |
| C8 | P3 | Enlaces | api/admin/busqueda/route.ts:84 | Resultado de cliente va a `?query=name`. | `/admin/clientes?customerId=<id>`. |
| C9 | P3 | Tests | test-all.mjs | cp034-customers-route y admin-customers-ui-contract fuera de `test:all`. | Tests de fusión y deduplicación en `test:all`. |

## Criterio de aceptación
- Dos solicitudes web con el mismo teléfono sin email → un cliente.
- Fusión A→B mueve adjuntos y cuenta; fusionar en uno ya fusionado se rechaza.
- En el 360 cada fila abre su módulo filtrado. VENTAS no ve "Exportar".

---

# Auditoría Pipeline/CRM
Ruta: /admin/crm (view=pipeline|closed) · Componentes: PipelineWorkspace.tsx, CrmOperations, CrmCreateForms; muertos: CrmPipeline, PipelineWorkspace/QuotesWorkspace/SalesWorkspace de AdminCategoryViews · Servicios: pipeline-repository.ts, pipeline-contract.ts, crm-service.ts · Tablas: opportunities, opportunity_followups, opportunity_stage_history, crm_tasks, crm_activities

## Tarea del usuario
Ventas abre el pipeline y ve seguimientos de hoy y vencidos; mueve tarjetas, registra llamadas, reprograma, abre la cotización.

## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| P1 | P1 | Enlaces | PipelineWorkspace.tsx:481-509 | Ignora `opportunityId`, `taskId`, `quoteId`, `action` que usan Dashboard y Operaciones. | Abrir el drawer correspondiente con la acción. |
| P2 | P1 | Función | pipeline-repository.ts:412-425; quote-service.ts:219; crm/page.tsx:34 | Dos sistemas de tareas: seguimientos de cotización (`crm_tasks`) no aparecen en la agenda; `CrmOperations` recibe `tasks={[]}`. | Una agenda con ambas fuentes (hoy, vencidos, responsable). |
| P3 | P1 | Datos | PipelineWorkspace.tsx:707,855,2065,870 | `datetime-local` recibe UTC → cada edición corre +5 h en Lima. | Formato local America/Lima. |
| P4 | P2 | Enlaces | api/admin/busqueda/route.ts:86 | Oportunidad → `/admin/oportunidades` (404). | `/admin/crm?view=pipeline&opportunityId=<id>`. |
| P5 | P2 | Estados | PipelineWorkspace.tsx:681-684,888 | `openDetail` no valida `response.ok`; un 403/404 rompe el timeline. | Validar y mostrar error en el drawer. |
| P6 | P2 | Datos | quote-service.ts:170,192-207 | Enviar/aceptar/rechazar cotización no toca la oportunidad (actividad sin `opportunityId`, etapa sin mover). | Actualizar oportunidad y su historial en la misma transacción. |
| P7 | P2 | Estados | PipelineWorkspace.tsx:597-652 | `followUpFrom/To` sin chip ni conteo. | Chip visible. |
| P8 | P2 | Rendimiento | pipeline-repository.ts:487,516,532-567 | 4 rondas secuenciales, ~28 consultas. | Un `Promise.all`. |
| P9 | P2 | UI | AdminCategoryViews.tsx:1353-1644; CrmPipeline.tsx; CrmOperations/CrmCreateForms | Código muerto ("No disponible" hardcodeado incluido); tokens de tienda; texto "Guardado en Neon". | Borrar muerto; pasar formularios al kit admin. |
| P10 | P3 | Datos | crm-service.ts:351 | Leads web sin vendedor asignado. | Asignación por regla o cola "Sin asignar" destacada. |
| P11 | P2 | Tests | admin-pipeline-ui-contract.test.mjs | 0/2 (valida código muerto); cp035 fuera de `test:all`. | Reescribir y enganchar. |

## Criterio de aceptación
- Desde "Seguimientos" en Inicio, clic abre el drawer correcto. Seguimiento de cotización de hoy aparece en la agenda.
- Reprogramar a las 10:00 sigue a las 10:00 tras recargar. Búsqueda de oportunidad abre su drawer. Un 404 muestra error, no crash.

---

# Auditoría Cotizaciones
Rutas: /admin/cotizaciones; pública /cotizacion → POST /api/cotizacion · Componentes: QuotesWorkspace.tsx, QuoteConversionControl.tsx, QuoteStatusControl.tsx (muerto) · Servicios: quote-repository.ts, quote-service.ts, quote-conversion-service.ts · Tablas: quotes, quote_items, quote_versions(+items), quote_status_history, quote_discount_approvals · Roles: quotes.*, pricing.discount.approve

## Tarea del usuario
Ventas cotiza una solicitud web, la envía, registra respuesta, da seguimiento y la convierte en venta + pedido. Gerencia aprueba descuentos.

Cómo llega una solicitud web: se inserta como `SENT` sin versión (api/cotizacion/route.ts:38); el lead se crea **fuera** de la transacción (:49); la notificación enlaza a `/admin/cotizaciones` sin identificarla (:50).

## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| Q1 | P0 | Función | QuotesWorkspace.tsx:314-315,339-340,1289,1298,1307 | El drawer hace POST a `/api/admin/cotizaciones/{id}/send|response|follow-up|version`, que no existen (las rutas reales no llevan `[id]` y leen `body.quoteId`) → 404. | Llamar a las rutas existentes con `quoteId` o moverlas bajo `[id]/`. |
| Q2 | P1 | Función | QuotesWorkspace.tsx:1316-1320; [id]/route.ts:7,19 | Cancelar hace POST a una ruta que solo tiene GET/PATCH → 405. | PATCH. |
| Q3 | P1 | Función | quote-service.ts:87,108,131,251 | `approveQuoteDiscount` sin ruta ni UI; aunque corriera, no desbloquea los ítems. | Ruta + panel de aprobación que actualice ítem y cotización en una transacción. |
| Q4 | P1 | Datos | api/cotizacion/route.ts:38 | Solicitud web entra como SENT v0 sin precios: no se puede editar ni aceptar. | Entrar como DRAFT (origen WEB). |
| Q5 | P1 | Datos | api/cotizacion/route.ts:37-53 | Lead fuera de la transacción: si falla, 503 con la cotización ya guardada → duplicado al reintentar. Rompe la regla transaccional. | Lead dentro del mismo `tx`. |
| Q6 | P1 | Enlaces | QuotesWorkspace.tsx; QuoteConversionControl.tsx:50; quote-repository.ts:147 | Sin links a cliente/oportunidad/venta/pedido/pago; tras convertir se descarta `{sale, order}`. | Links "Ver venta/pedido" y redirección tras convertir. |
| Q7 | P2 | Datos | QuoteConversionControl.tsx:7,55 | Lee `unitPrice` pero la API da `finalUnitPrice`/`lineTotal` → precios en blanco; sin total. | Mostrar precio final, total de línea y total. |
| Q8 | P2 | Función | QuoteConversionControl.tsx:47 | `deliveryMethod` fijo en PICKUP. | Elegir método; delivery exige dirección. |
| Q9 | P2 | Enlaces | QuotesWorkspace.tsx:266-271 | Cualquier `customerId` abre "Nueva cotización"; `quoteId` ignorado. | Crear solo con `new=1`; `quoteId` abre drawer. |
| Q10 | P2 | Datos | quote-repository.ts:108-112,125 | "Próximas a vencer" cuenta canceladas/convertidas; métricas ignoran filtros. | SENT/FOLLOW_UP y mismo `where`. |
| Q11 | P2 | Datos | quote-service.ts:105-108 | Cada guardado duplica aprobaciones PENDING. | Reemplazar las anteriores. |
| Q12 | P2 | Rendimiento | quote-repository.ts:93 | Carga todas las filas para contar estados. | `GROUP BY`. |
| Q13 | P2 | UI/A11y | QuoteConversionControl.tsx:55; QuotesWorkspace.tsx:28 | Tokens de tienda, 176 hex; modal sin `role=dialog`/Escape; QuoteStatusControl muerto. | Kit admin + AdminDrawer; borrar muerto. |
| Q14 | P2 | Notificación | api/cotizacion/route.ts:50 | Notificación sin identificar la cotización; oportunidad sin vendedor. | `/admin/cotizaciones?quoteId=…`; notificar al vendedor. |
| Q15 | P2 | Tests | package.json:66; test-all.mjs | cp036 fuera de `test:all`; no detectaron Q1/Q2. | Test de existencia de rutas (fetch UI ↔ `app/api`) + tests de servicio. |

## Criterio de aceptación
- VENTAS 1920/390: solicitud web → Borrador con notificación que la abre → precio y envío (v1) → aceptación → convertir; modal con precios y total → links a venta y pedido.
- Cancelar pide motivo y funciona. Descuento sobre umbral bloquea el envío; GERENCIA aprueba en el drawer.
- Falla del lead no deja cotización guardada. `?customerId=X` filtra sin abrir el diálogo. `test:all` con cp036 + test de rutas en verde.
