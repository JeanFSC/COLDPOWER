# CP-037 — Gestión de clientes

Fecha: 2026-09-06  
Entorno: `https://dev.coldpower.pe` en la sesión autenticada del usuario  
Script de arranque: `ops/start-public.ps1`

Base SHA: `df60352` (working tree con cambios no commiteados de CP037–CP040).

## Artefactos

- UI: `src/components/admin/CustomersControlCenter.tsx`, `src/components/admin/CustomerDetailPanel.tsx`.
- Página y API: `src/app/admin/clientes/`, `src/app/api/admin/clientes/`.
- Datos: `src/lib/customer-repository.ts`, `src/lib/customer-operations-query.ts`, `src/lib/customer-operations-service.ts`.

## Resultado ejecutivo

El centro `/admin/clientes` carga desde PostgreSQL y conserva el flujo Customer 360. Los cuatro KPI observados en navegador fueron:

| KPI | Valor observado |
| --- | ---: |
| Clientes registrados | 60 |
| Clientes activos | 53 |
| Por atender | 48 |
| Oportunidades activas | 40 |

`Por atender` se calcula server-side con condiciones operativas actuales; no se deriva de clientes sin actividad histórica. `Oportunidades activas` cuenta oportunidades, no clientes.

## Cambios verificados

- Filtros persistentes en URL: búsqueda, estado, tipo, responsable, ciudad, departamento, oportunidad abierta/sin oportunidad, atención, seguimiento vencido, sin actividad, cotizaciones, ventas y rangos de alta/última actividad.
- Tabla paginada con cliente, tipo, contacto, teléfono, email, ciudad, actividad reciente, estado, responsable y acciones.
- Menú contextual probado con sesión Superadmin: ver 360°, registrar actividad, crear tarea, crear oportunidad, crear cotización, ver ventas, ver pedidos, editar, fusionar y desactivar.
- `Crear oportunidad` abrió `/admin/crm?customerId=...&open=new` con el cliente real preseleccionado y bloqueado.
- `Crear cotización` abrió `/admin/cotizaciones?customerId=...&new=1` con el cliente real cargado y preseleccionado.
- El Customer 360 mantiene relaciones reales de oportunidades, cotizaciones, ventas, pedidos, pagos, contactos, direcciones, notas y actividad, sujetas a permisos.
- En Customer 360, `sales.view` y `payments.view` se evalúan por separado: cada pestaña financiera solo carga sus datos cuando el permiso correspondiente está presente.
- El panel derecho quedó conectado a datos reales con `Distribución por tipo`, `Distribución geográfica` y `Requieren atención`; los cuatro accesos de atención filtran la cartera desde la URL y recalculan la tabla server-side.
- El alta de cliente quedó como wizard de tres pasos (`Identidad`, `Contacto`, `Relación`), con revisión de duplicados antes de habilitar `Crear cliente`; la revisión se probó sin persistir un registro.
- La navegación al módulo dispone de un `loading.tsx` estructural con skeleton para encabezado, KPI, filtros, tabla y panel lateral.
- El segmento dispone de `error.tsx` con alerta accionable, reintento y mensaje seguro que no expone detalles internos.
- La creación transaccional persiste el cliente y, cuando fueron informados, contacto principal, dirección principal, nota y sus eventos de auditoría en la misma transacción.
- No se crearon ni modificaron registros durante esta QA.

## Pruebas

- `corepack pnpm test:cp037-clients`: 8/8 PASS.
- Runtime de clientes con `.env.local`: 6/6 PASS.
- `corepack pnpm exec tsc --noEmit`: PASS.
- `corepack pnpm build`: PASS.
- `corepack pnpm lint`: 0 errores; quedan 14 warnings en superficies no relacionadas con CP-037.
- `corepack pnpm test:all`: los bloques previos pasan (69/69, 47/47, 26/26 y 13/13); la fase de inventario queda en 19/20 por el archivo canónico ausente `INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx`.
- Auditoría PostgreSQL de solo lectura: 60 clientes, 72 oportunidades, 120 ventas y 585 auditorías; 0 inconsistencias de moneda, relaciones, líneas o historial de pagos; migración más reciente registrada: 44.
- `git diff --check`: sin errores de whitespace; PowerShell reporta únicamente avisos de conversión LF/CRLF.
- Smoke de PostgreSQL: 60 clientes cargados; categorías de atención `48 / 0 / 40 / 0` para seguimiento vencido, sin responsable, oportunidad estancada y cotización por responder, respectivamente.
- Durante la verificación, `http://127.0.0.1:3000/api/health` y `https://dev.coldpower.pe/api/health` respondieron `200` con `{"ok":true,"service":"coldpower"}`; Cloudflare registró cuatro conexiones QUIC.

## Estado de publicación al cierre

El endpoint público sigue sano en el puerto 3000 y, durante la comprobación autenticada, sirvió el nuevo skeleton de carga antes de mostrar el dashboard con datos y gráficos. Sin embargo, el proceso `next start` inició a las 01:43 y el build actual fue generado a las 05:08; PostgreSQL reporta 53 clientes activos mientras el dashboard público todavía muestra 50. No se ejecutó `ops/start-public.ps1` ni se añadió un lazo supervisor; se requiere un reinicio manual controlado para publicar completamente el build actual.

## Evidencia de navegador

Se verificó navegación, filtros, menú de fila, Customer 360 y enlaces cruzados en Brave, conservando la sesión iniciada. El viewport disponible mostró la composición desktop; la matriz exacta 1440x900, 1024x768, 768x900 y 390x844 no se declara como captura independiente porque esta sesión no permite cambiar programáticamente el viewport. Customer 360 cargó datos reales y mostró sus diez secciones, relaciones y acciones contextuales.

Las capturas se inspeccionaron durante esta ejecución mediante CUA. Esta API no exporta los bytes como archivos persistentes, por lo que no se fabricaron PNG falsos ni se declara la existencia de `cp037-*.png` en el repositorio.

## Observaciones pendientes

- El formulario de actividad usa los campos persistentes `result`, `occurredAt`, `nextAction` y `nextActionAt`; la creación de seguimiento genera una tarea enlazada y auditable. La cobertura ejecutada fue contractual y no mutó un registro real.
- Si se requieren archivos PNG versionados como entregable, falta exportarlos desde una herramienta de captura que permita guardar la evidencia; la revisión responsive exacta por viewport sigue pendiente.
