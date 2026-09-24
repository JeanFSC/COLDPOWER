# Base local de ColdPower

Este entorno usa PostgreSQL 17 portable en Windows y no modifica ni consulta la configuración de Neon. Los binarios y los datos viven fuera del repositorio:

- Binarios: `C:\Users\jean_\pg17\pgsql\bin`
- Cluster: `C:\Users\jean_\pgdata-coldpower`
- Endpoint: `postgres://coldpower:<contraseña-local>@127.0.0.1:5432/coldpower`
- Entorno de la aplicación: `.env.localdb` (ignorado por Git)

## Primera preparación

El ZIP oficial de EnterpriseDB PostgreSQL 17 para Windows x64 se descarga en `C:\Users\jean_\pg17\` y se extrae allí. La estructura esperada es `C:\Users\jean_\pg17\pgsql\bin`.

Inicializa e inicia el cluster con:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\pg-local-start.ps1
```

El script crea el cluster con usuario `coldpower`, UTF-8, locale `C`, autenticación por contraseña y la base `coldpower`. La contraseña local se conserva fuera del repo en `C:\Users\jean_\pg-local-coldpower-password.txt`.

## Orden reproducible

Desde la raíz del repo:

```powershell
corepack pnpm db:local:migrate
corepack pnpm db:local:restore
corepack pnpm db:local:seed
corepack pnpm dev:local
```

`db:local:restore` usa por defecto `tmp/backups/cp025-pre-migration-2026-09-23T23-19-56-959Z.json`, exige que `DATABASE_URL` sea `localhost`, `127.0.0.1` o `::1`, conserva los IDs, slugs y SKU, y verifica las filas restauradas contra el backup.

El seed local ejecuta, en este orden:

1. `seed-dev-mock.ts`: precios, inventario, cotizaciones, CRM, ventas, pedidos, pagos y auditoría de desarrollo.
2. `seed-visual-year.ts`: series visuales anuales de ventas, pedidos, pagos, inventario y CRM.
3. `seed-purchases-dev.ts`: proveedores, solicitudes, compras y recepciones.
4. `seed-pipeline-gaps.ts`: pendientes y seguimientos del pipeline CRM.
5. `seed-notifications-dev.ts`: reglas, plantillas, programación y bandeja de notificaciones.
6. `seed-team-activity-dev.ts`: actividad reciente del equipo.
7. `seed-catalog-kpi-visual-history.ts`: histórico visual de KPI del catálogo.
8. `seed-home-espejo.ts`: seis productos destacados y seis adicionales con precios/promoción para validar el home.

Todos los seeds requieren `--confirm-dev-mock`, están bloqueados en producción y usan IDs deterministas. Sus datos son fixtures de desarrollo no operativas; no representan ventas, inventario, pagos ni promociones comerciales reales.

## Arranque y parada

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\pg-local-status.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\pg-local-stop.ps1
```

Para la revisión de la aplicación:

```powershell
corepack pnpm dev:local
```

La aplicación queda en `http://localhost:3002` y hereda el bypass de autenticación de desarrollo copiado desde `.env.local`.

## Conteos del backup restaurado

| Tabla | Filas |
| --- | ---: |
| `users` | 22 |
| `categories` | 27 |
| `families` | 171 |
| `brands` | 60 |
| `products` | 1,348 |
| `productRelations` | 0 |
| `quoteCarts` | 138 |
| `quotes` | 128 |
| `quoteItems` | 128 |
| `quoteStatusHistory` | 128 |

## Riesgos y límites

- La base local no es una réplica completa de Neon: el backup corresponde a una revisión anterior y los seeds agregan fixtures para módulos posteriores.
- Repetir los seeds es idempotente por diseño, pero restaurar no elimina filas adicionales creadas por fixtures.
- El puerto `5432` debe estar libre y el puerto de Next local es `3002`.
- Borrar `C:\Users\jean_\pgdata-coldpower` elimina la base local y su contraseña; `.env.localdb` deberá regenerarse o actualizarse antes de iniciar de nuevo.
- `.env.local` permanece sin cambios y sigue siendo el entorno de Neon para los comandos existentes.
