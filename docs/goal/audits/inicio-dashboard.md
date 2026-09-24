# Auditoría Inicio/Dashboard — 2026-09-23

Ruta(s): `/admin`, `/admin/inicio`, `/admin/dashboard` · Components: `src/components/admin/AdminTanda2Workspaces.tsx`, `src/components/admin/AdminShell.tsx`, `src/components/admin/AdminSegmentError.tsx` · Services: `src/lib/admin-landing.ts`, `src/lib/operations-dashboard.ts`, `src/lib/operations-workspace.ts`, `src/lib/admin-workspace-service.ts`, `src/lib/notifications-service.ts` · Tables: órdenes, pagos, clientes, productos, inventario, CRM, notificaciones, preferencias y actividad administrativa consultadas por los servicios anteriores · Roles: permisos RBAC desde `requirePermission`, `can` y `permissionsForRole`.

## Tarea

Verificar que el landing administrativo y el dashboard ejecutivo sean rutas reales, autorizadas por rol, alimentadas desde PostgreSQL, útiles para la operación y recuperables ante fallos de carga.

## Hallazgos

| # | Severidad | Estado | Hallazgo | Evidencia / impacto |
|---|---|---|---|---|
| 1 | P1 | Cerrado | `/admin/inicio` convertía fallos del resumen operativo en `null` y mostraba tarjetas vacías como si fueran datos válidos. | `src/app/admin/inicio/page.tsx` ahora propaga el fallo de `getHomeActivitySummary` o `getOperationsWorkspace` al error boundary segmentado. |
| 2 | P1 | Cerrado | `/admin/dashboard` también absorbía un fallo de `getOperationsDashboard` y renderizaba el workspace con datos nulos. | La página ahora registra el error y lanza `ADMIN_DASHBOARD_DATA_UNAVAILABLE`; `/admin/dashboard/error.tsx` ofrece reintento. |
| 3 | P2 | Cerrado | El landing administrativo necesitaba estados explícitos de carga y error con recuperación. | Existen `src/app/admin/inicio/loading.tsx` y `src/app/admin/inicio/error.tsx`, con skeleton accesible y `unstable_retry`. |

No se encontró un P0 en las rutas revisadas. El acceso continúa dependiendo de `dashboard.view`; `/admin` redirige al landing permitido por rol y los accesos rápidos se filtran con `can(role, permission)`. Las métricas, colas, actividad, conversiones, margen, inventario y enlaces se obtienen de servicios persistentes; no se identificaron arrays de métricas operativas hardcodeadas en el landing.

## Evaluación CMS — Brief 11

**Estado: sigue oculto intencionalmente.** `HIDDEN_ADMIN_MODULES` conserva `/admin/cms`, el filtro de `admin-workspace-service` lo excluye de la navegación y la ruta redirige a `/admin/inicio`. No se desocultó porque la experiencia no está completa de punta a punta.

| Área | Estado verificado | Faltante para desocultar |
|---|---|---|
| Editor y publicación | Existe editor por bloques, validación server-side, permisos y guardado de estados. | Falta una superficie editorial completa para operar el ciclo de vida sin depender de rutas técnicas/API. |
| Media | Biblioteca con carga, preview, alt, archivado lógico y usos trazables; asociador de slots disponible. | Falta una gestión de slots más gobernada, incluida desasociación clara y estados de error de carga visibles en toda la biblioteca. |
| Revisiones | Existen persistencia y API paginada de revisiones, además de acciones `RESTORE`/`UNPUBLISH` en el contrato. | La UI no expone listado, comparación ni restauración de revisiones; tampoco ofrece un control editorial completo de despublicación. |
| Preview y tienda | Existe endpoint de preview y el CMS público solo expone bloques publicados. | Falta probar el flujo completo editor → preview → publicación → tienda con una sesión autenticada y una página real antes de habilitar navegación. |

**Decisión:** conservar el módulo oculto hasta cerrar revisiones/restauración, slots/media y la prueba end-to-end de efecto real en la tienda. No se presenta como CMS listo.

## Plan

1. Mantener el contrato de error propagado para fallos de datos críticos.
2. Conservar degradación parcial únicamente para perfil, preferencias, recientes y contador de notificaciones, que no deben impedir la disponibilidad del workspace principal.
3. Validar en sesión autenticada `/admin/inicio` y `/admin/dashboard` a 1920 × 1080, incluyendo navegación por teclado, enlaces filtrados por rol, skeleton, reintento y consola.

## Criterio de cierre

- [x] Landing `/admin` autorizado y con redirección por rol.
- [x] `/admin/inicio` muestra tareas, notificaciones, métricas y accesos provenientes de servicios reales.
- [x] `/admin/dashboard` muestra métricas comerciales, operativas y de inventario de la vista vigente.
- [x] Estados de carga y error recuperable presentes en ambas rutas.
- [x] Fallos de datos críticos no se presentan como ceros o listas vacías válidas.
- [x] Validación visual en navegador autenticado: `/admin/inicio` y `/admin/dashboard` verificados en Brave personal autenticado con objetivo de viewport 1920 × 1080 a zoom 100%; también se comprobaron Home, catálogo, búsqueda, contacto, 404 y la redirección de CMS.

La conexión CUA utilizada no expone un override de viewport para ejecutar una prueba real a 390 px ni una extracción de consola; por eso esa limitación queda explícita y no se presenta como evidencia de navegador.
