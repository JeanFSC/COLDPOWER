# Auditoría módulos de Gestión — 2026-09-22
Reportes · Notificaciones · Auditoría · Usuarios · Configuración

> Auditoría de código (lectura). **Críticos de seguridad:** A1 (la API de auditoría entrega `before/after` sin redactar a REPORTES) y U1 (GERENCIA puede invitar JEFATURA: escalada de privilegios).

Comunes a los cinco: sin `error.tsx`; `requirePermission` (auth.ts:138) redirige a `/` en vez de 403; cp042–cp046 fuera de `test:all`; cp044-reporting-schedules, admin-users-ui-contract y admin-notifications-ui-contract sin script.

# Reportes
Ruta: /admin/reportes · AdminReportsStitch, ReportScheduleControls · reporting-service.ts, dashboard-export.ts · report_schedules(+runs) · reports.view (SUPERADMIN, GERENCIA, JEFATURA, REPORTES)

| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| R1 | P1 | Función | reporting-service.ts:132-175,241; ReportScheduleControls.tsx:149 | Las programaciones se guardan pero nunca corren ("Worker de ejecución pendiente"). | Runner (cron con `FOR UPDATE`) que registra la corrida, notifica y avanza `nextRunAt`; o esconder la función. |
| R2 | P1 | Roles | admin/layout.tsx:97-100 | REPORTES no ve Reportes ni Auditoría en el menú. | Menú por permisos. |
| R3 | P2 | Enlaces | AdminReportsStitch.tsx:455-457,470-471 | "Ver todos los productos" → catálogo sin permiso → redirect a "/"; productos sin link. | Link solo con permiso; cada producto a su ficha admin. |
| R4 | P2 | Datos | dashboard-export.ts:12-28 | CSV sin moneda ni rango. | Fila `moneda` y rango. |
| R5 | P2 | Datos | reportes/page.tsx:67-81 | Filtros armados a mano: fechas inválidas o `from > to` se ignoran. | Mismo parser que la API; error visible. |
| R6 | P3 | Datos | reporting-service.ts:108 | Destinatarios sin validar. | Solo staff ACTIVE. |
| R7 | P3 | UI | page.tsx:42-47,273; ReportScheduleControls.tsx:34 | Hex y 10 px. | Kit admin. |
| R8 | P3 | Tests | cp044-reporting-schedules.test.ts:53 | Solo strings, sin script. | Test que ejecute una corrida. |

# Notificaciones
Ruta: /admin/notificaciones · AdminNotificationsModule, NotificationsList, NotificationAdminControls, AdminShell (campana) · notifications-service.ts, notification-rules-service.ts

| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| N1 | P1 | Enlaces | sales-service.ts:104,250; payment-service.ts:228; inventory.ts:41; api/cotizacion/route.ts:50; crm-service.ts:326 | Links a la lista del módulo; el ID está en `metadata` pero no en el link. | Deep-link `?orderId=`, `?quoteId=`, `?paymentId=`. |
| N2 | P1 | Roles | notifications-service.ts:16,84 | JEFATURA, ADMIN y COMPRAS no reciben notificaciones automáticas (lista fija). | Destinatarios por permiso. |
| N3 | P2 | Función | notificaciones/preferencias/route.ts:5-6; notifications-service.ts:115-116 | Preferencias guardadas pero no usadas; sin UI. | Respetarlas al enviar + UI. |
| N4 | P2 | Roles | AdminShell.tsx:337-347; layout.tsx:96 | Campana visible para roles sin `notifications.view` → redirect a "/". | Ocultar o dar permiso. |
| N5 | P2 | Rendimiento | notificaciones/page.tsx:47-53 | Procesa programaciones al renderizar (escritura en lectura). | Cron real. |
| N6 | P3 | Seguridad | notifications-service.ts:19 | `safeLink` acepta URLs externas en avisos manuales. | Solo rutas internas. |
| N7 | P3 | Función | NotificationsList.tsx:261 | Abrir el detalle no marca como leída. | Marcar al abrir. |

# Auditoría (módulo)
Ruta: /admin/auditoria · AdminAuditModule, AuditModuleControls · audit-repository.ts, audit-contract.ts · audit.view (SUPERADMIN, GERENCIA, JEFATURA, REPORTES); audit.sensitive.view (sin REPORTES)

| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| A1 | P0 | Seguridad | api/admin/auditoria/route.ts:6; audit-repository.ts:60 | La API de lista devuelve `before/after/metadata` (IP, user agent) sin redactar a cualquiera con `audit.view`, incluido REPORTES. | Redactar sin `audit.sensitive.view`, igual que la página. |
| A2 | P1 | Seguridad | auditoria/page.tsx:68; [id]/route.ts:6 | Detalle y diff sin `sanitizeAuditValue`; inserts directos (reporting-service.ts:161, usuarios/[id]/route.ts:58) no se sanitizan. | Sanitizar al leer. |
| A3 | P1 | Estados | auditoria/page.tsx:54 | `?page=abc` rompe el segmento. | Parsear dentro de try/catch. |
| A4 | P2 | Enlaces | AdminAuditModule.tsx:329,412 | `entityId` sin link. | Mapear `entityType` → ruta filtrada. |
| A5 | P2 | Roles | layout.tsx:105 | GERENCIA tiene permiso pero el menú lo oculta. | Alinear. |
| A6 | P2 | Rendimiento | auditoria/export/route.ts:10 | Export sin límite recalculando KPIs. | Streaming o tope. |
| A7 | P2 | Seguridad | auditoria/export/route.ts:9; usuarios/export/route.ts:5 | CSV vulnerable a inyección de fórmulas. | Neutralizar `= + - @`. |
| A8 | P3 | Función | auditoria/filtros/route.ts:15-24; audit-repository.ts:250 | Filtros guardados sin validar ni DELETE. | Whitelist + DELETE. |

# Usuarios
Ruta: /admin/usuarios · AdminUsersStitch, UserRoleControl, StaffInvitationForm/Actions · user-administration.ts, staff-invitations.ts. Ya correcto: cambios auditados; no se puede degradar al último superadmin ni autobloquearse.

| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| U1 | P0 | Seguridad | user-administration.ts:44 | GERENCIA y JEFATURA tienen el mismo rango: GERENCIA puede invitar JEFATURA (más permisos). **Escalada de privilegios.** | Permisos del invitado ⊆ permisos del que invita, o solo SUPERADMIN invita gestión. |
| U2 | P1 | Roles | usuarios/page.tsx:76; AdminUsersStitch.tsx:622-631; [id]/route.ts:25 | JEFATURA ve controles de rol que siempre dan 403. | `canManage = can(role,"roles.manage")`. |
| U3 | P1 | Función | UserRoleControl.tsx:66-81 | Cambiar rol/estado se aplica al instante, sin confirmación. | Diálogo de confirmación con impacto. |
| U4 | P2 | Datos | usuarios/[id]/route.ts:37-49 | Clerk se actualiza antes de la verificación bajo lock → desincronía. | Validar primero, luego Clerk. |
| U5 | P2 | Roles | AdminUsersStitch.tsx:657 | Cancelar/reenviar invitación sin `canInvite`. | Condicionar. |
| U6 | P2 | Roles | layout.tsx:105 | GERENCIA puede invitar pero no ve Usuarios. | Alinear. |
| U7 | P2 | Enlaces | AdminUsersStitch.tsx:569 | "Ver toda la auditoría" sin filtro. | `?entityType=user&entityId=`. |
| U8 | P1 | Estados | usuarios/page.tsx:36,62 | Filtro malo o falla de BD rompe la página. | try/catch + estado de error. |
| U9 | P3 | Función | StaffInvitationForm.tsx:18-22 | Se invitan 3 roles; el control ofrece 11. | Catálogo único de roles. |

# Configuración
Ruta: /admin/configuracion · Tanda2Settings, CompanySettingsForm, DocumentSeriesManager, TestIntegrationsButton · company-settings.ts, document-series.ts, integrations.ts. Ya correcto: versionado optimista + lock, historial y auditoría, sin secretos en respuestas.

| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| C1 | P1 | Auditoría | document-series.ts:43-73 | Crear/activar series no audita. | Auditar en transacción. |
| C2 | P2 | Función | document-series.ts | Ninguna numeración usa `document_series`: decorativas. | Conectar o rotular "sin uso". |
| C3 | P2 | Función | configuracion/historial/route.ts:9; restaurar/route.ts:11 | Historial y restaurar sin UI. | Panel con diff + restaurar con confirmación. |
| C4 | P2 | Roles | api/admin/configuracion/** | Todo usa `company.settings.manage`; `integrations.manage` sin uso. | Permisos específicos. |
| C5 | P2 | Estados | configuracion/page.tsx:66-68 | Error de carga solo se loguea: página "vacía". | Error visible con reintentar. |
| C6 | P2 | Rendimiento | integrations.ts:181 | Pruebas secuenciales (~25 s). | `Promise.allSettled`. |
| C7 | P3 | UI | CompanySettingsForm.tsx:270 | Tokens de tienda. | Kit admin. |
| C8 | P3 | UI | layout.tsx:111; page.tsx:12 | "Configuracion" sin tilde. | "Configuración". |

## Orden de corrección
1. Seguridad: A1, A2, A7, U1, U2, U3, N6.
2. Roles/menú (junto con Fundaciones): R2, A5, U6, N2, N4.
3. Estados: error.tsx en los cinco, A3, U8, C5.
4. Función: R1 runner, N1 deep-links, N3, C1, C3.
5. Resto P2/P3 y tests.

## Criterio de aceptación
REPORTES: `GET /api/admin/auditoria` sin before/after y ve Reportes en el menú. GERENCIA invitando JEFATURA → 400. JEFATURA sin controles de rol; cambio de rol pide confirmación y queda auditado. Programación a 1 min crea corrida + notificación. VENTAS abre ORDER_CREATED y cae en el pedido. CSV neutralizado. Series auditadas; restaurar versión N crea N+1.
