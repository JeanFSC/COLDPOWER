# Auditoría Fundaciones — 2026-09-23

Ruta(s): `/admin`, `/admin/inicio`, `/admin/*`, `/api/admin/busqueda`  
Componentes: `AdminShell`, `AdminUsersStitch`, `AdminTanda2Workspaces`, `AdminSegmentError`  
Servicios: autenticación/RBAC, búsqueda administrativa, notificaciones, landing administrativa  
Tablas: usuarios, notificaciones, clientes y oportunidades consultadas por los servicios existentes  
Roles: `src/lib/roles.ts` (`AppRole` y permisos de negocio)

## Tarea del usuario

Completar las fundaciones del panel administrativo: aterrizaje por rol, denegación dentro del shell, navegación única filtrada por permisos, deeplinks de búsqueda, límites de error por módulo, limpieza de componentes muertos, tipografía IBM Plex y contratos alineados con la implementación vigente.

## Hallazgos

| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---:|:---:|---|---|---|---|
| 1 | P1 | Roles/landing | `src/app/admin/page.tsx:11` (baseline) | Toda entrada administrativa con permiso de dashboard era redirigida directamente a `/admin/inicio`, sin resolver el primer destino permitido para roles operativos. | Dashboard permitido lleva a Inicio; los demás roles aterrizan en su módulo principal permitido y no quedan en un bucle de acceso. |
| 2 | P1 | Autorización | `src/lib/auth.ts:138` (baseline) | Una denegación de permiso enviaba a `/`, mezclando falta de autorización con navegación pública. | La denegación permanece dentro del shell en `/admin/sin-acceso`, con retorno al inicio permitido; los redirects públicos quedan reservados para autenticación inválida. |
| 3 | P1 | Navegación/RBAC | `src/app/admin/layout.tsx:10,52` (baseline) | La navegación estaba partida en `managementLinks` y `operationsLinks`, con excepciones por rol y conteo de notificaciones separado del permiso. | Una única matriz declara sección, ruta y permiso; cada enlace se muestra sólo si `can(role, permission)` y la campana sólo si existe `notifications.view`. |
| 4 | P1 | Búsqueda | `src/app/api/admin/busqueda/route.ts:84,86` (baseline) | Los resultados de clientes y oportunidades apuntaban a query/path antiguos (`query` y `/admin/oportunidades`). | Cliente abre `/admin/clientes?customerId=` y oportunidad `/admin/crm?view=pipeline&opportunityId=` con valores codificados. |
| 5 | P1 | Resiliencia | módulos administrativos sin `error.tsx` | Doce segmentos no tenían un límite de error local para preservar el shell y ofrecer reintento. | Cada segmento requerido tiene `error.tsx` y delega en `AdminSegmentError` con `unstable_retry`. |
| 6 | P1 | Mantenibilidad | componentes administrativos muertos | Existían componentes duplicados o sin consumidores runtime (`AdminDashboardView`, controles antiguos de catálogo, inventario, pedidos, pagos, precios, ventas, cotizaciones y transferencias). | Se eliminan sólo después de verificar imports; las implementaciones activas permanecen como fuente canónica. |
| 7 | P1 | Duplicación | `src/components/admin/AdminCategoryViews.tsx:1353,1477,1546` (baseline) | El archivo contenía workspaces duplicados de pipeline, cotizaciones y ventas junto a la superficie CRM activa. | Se conserva `CustomersWorkspace` porque tiene consumidor activo y se retiran únicamente los duplicados sin consumidores. |
| 8 | P1 | Contratos | `scripts/cp028-user-safety-contract.test.mjs`, `scripts/staff-invitation-route-contract.test.mjs` | Dos contratos exigían que la página de usuarios renderizara directamente `StaffInvitationForm` y usara `status={user.status}`, aunque la implementación real delega en `AdminUsersStitch`. | Los contratos validan la composición vigente: props de permisos en la página y render condicional/estado detallado dentro de `AdminUsersStitch`. |
| 9 | P2 | Tipografía | `src/app/layout.tsx:20`, `src/app/globals.css:144-146` (baseline) | El layout usaba fallback local y las variables globales no estaban conectadas a una familia de producto consistente. | IBM Plex Sans (400/500/600/700) y IBM Plex Mono se cargan por `next/font/google` y alimentan las variables globales. |
| 10 | P2 | Verificación | `scripts/test-all.mjs` | El agregador incluía una prueba runtime incompatible con este alcance y no imponía timeout a cada grupo Node. | Se omite sólo `phase13-health-runtime.test.mjs`, se fuerza `--test-timeout=60000` y se conservan las demás verificaciones; las pruebas de contratos obsoletos se actualizan al árbol real. |

## Plan de corrección (orden, archivos)

1. `src/lib/admin-landing.ts`, `src/app/admin/page.tsx`, `src/app/admin/inicio/page.tsx`: centralizar el destino por rol y exigir el permiso correcto en la ruta de Inicio.
2. `src/lib/auth.ts`, `src/app/admin/sin-acceso/page.tsx`: separar autenticación de autorización y mantener la denegación dentro del panel.
3. `src/app/admin/layout.tsx`, `src/components/admin/AdminShell.tsx`: consolidar navegación, secciones y visibilidad de notificaciones.
4. `src/app/api/admin/busqueda/route.ts`: corregir deeplinks de cliente y oportunidad.
5. Los doce `src/app/admin/*/error.tsx`: añadir límites locales con reintento.
6. Componentes administrativos sin consumidores y `AdminCategoryViews.tsx`: eliminar duplicados verificados sin modificar superficies activas.
7. `src/app/layout.tsx`, `src/app/globals.css`: aplicar IBM Plex y sus variables.
8. Contratos en `scripts/`: alinear pruebas de usuarios y contratos huérfanos con componentes/rutas activos; mantener la prueba runtime fuera de la ejecución solicitada.
9. Ejecutar pruebas focalizadas con timeout de 60 s, `tsc`, lint de los archivos propios y `node scripts/test-all.mjs`; no realizar commit.

## Criterio de aceptación (qué se prueba en navegador y con qué rol)

- Con cada rol de `src/lib/roles.ts`, una visita a `/admin` aterriza en `/admin/inicio` si tiene `dashboard.view` o en el primer módulo permitido; un rol sin destino obtiene el estado administrativo sin acceso.
- Con un rol sin el permiso de un módulo, la URL permanece dentro de `/admin/sin-acceso`, el shell no se pierde y el enlace de retorno apunta a un destino permitido.
- La navegación muestra sólo permisos autorizados por rol, respeta las secciones Comercial/Operación/Catálogo/Gestión y oculta la campana cuando falta `notifications.view`.
- Un administrador prueba los dos deeplinks de búsqueda y confirma que conservan los identificadores; un rol sin permiso no obtiene acceso indirecto.
- En cada uno de los doce segmentos, un error recuperable conserva el shell y permite reintentar.
- En `/admin/usuarios`, la página pasa permisos a `AdminUsersStitch`; la invitación y cambio de rol se prueban con un rol con `users.invite`/`users.manage` y se comprueba el estado real de `detail.user`.
- La comprobación visual final debe ejecutarse en navegador autenticado a 1920×1080, zoom 100 %, revisando teclado, responsive, estados vacío/carga/error y consola. En esta ejecución queda diferida porque la instrucción del usuario prohíbe abrir servidores.
