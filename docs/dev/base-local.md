# Base local de ColdPower

La base local usa PostgreSQL 18 instalado como servicio de Windows. Este clúster es independiente de cualquier entorno remoto y es la única base autorizada para la QA local.

- Servicio: `postgresql-18-coldpower`
- Binarios: `C:\PostgreSQL\18\bin`
- Datos: `C:\PostgreSQL\18\data`
- Endpoint: `postgres://coldpower:<contraseña-local>@127.0.0.1:5433/coldpower`
- Entorno de la aplicación: `.env.localdb` (ignorado por Git)

La instalación portátil de PostgreSQL 17 quedó apagada y fuera de uso. No se debe iniciar con `pg_ctl`, ni reutilizar `C:\Users\jean_\pg17` o el puerto `5432`.

## Estado, arranque y parada

Los scripts consultan y controlan el servicio con `Get-Service`, `Start-Service` y `Stop-Service`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\pg-local-status.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\pg-local-start.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\pg-local-stop.ps1
```

El estado no requiere elevación. El arranque y la parada pueden requerir una consola de PowerShell ejecutada como Administrador; los scripts muestran una advertencia y explican el error si Windows rechaza la operación.

El servicio ya contiene el clúster y escucha en `127.0.0.1:5433`. El script de arranque comprueba los binarios, inicia el servicio si hace falta y verifica que exista la base `coldpower`; no inicializa otro clúster ni crea datos fuera de `C:\PostgreSQL\18\data`.

La contraseña local se conserva fuera del repositorio en `C:\Users\jean_\pg-local-coldpower-password.txt`. Como alternativa, el arranque acepta `CP_PG_LOCAL_PASSWORD` o lee la contraseña de `DATABASE_URL` en `.env.localdb`.

## Orden reproducible

Desde la raíz del repo, con `DATABASE_URL` de `.env.localdb`:

```powershell
corepack pnpm db:local:migrate
corepack pnpm db:local:restore
corepack pnpm db:local:seed
```

`db:local:restore` usa por defecto `tmp/backups/cp025-pre-migration-2026-09-23T23-19-56-959Z.json`, exige que `DATABASE_URL` sea local, conserva los IDs, slugs y SKU, y verifica las filas restauradas contra el backup.

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

## Servidor local y QA

El script `dev:local` existente usa el puerto `3002` para desarrollo. Ese puerto pertenece a otro flujo y no debe tocarse durante la QA de este ticket.

La QA final usa un build de producción con `.env.localdb` en el puerto `3003`:

```powershell
corepack pnpm build
$env:CP_DEV_AUTH_BYPASS = "true"
$env:CP_DEV_AUTH_ALLOWED_HOSTS = "localhost:3003,127.0.0.1:3003"
corepack pnpm exec dotenv -e .env.localdb -- next start --hostname 0.0.0.0 --port 3003
```

El usuario de prueba se define por turno con `CP_DEV_AUTH_USER_ID`; al cambiar de rol se reinicia el servidor. No usar los puertos `3000`, `3002` ni `3007`, y no apuntar la QA a una base remota.

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

- La base local no es una réplica completa de un entorno remoto: el backup corresponde a una revisión anterior y los seeds agregan fixtures para módulos posteriores.
- Repetir los seeds es idempotente por diseño, pero restaurar no elimina filas adicionales creadas por fixtures.
- PostgreSQL local debe escucharse solo en `127.0.0.1:5433`; el puerto `5432` pertenece a la configuración obsoleta v17.
- Detener o eliminar `C:\PostgreSQL\18\data` elimina el clúster local; antes de hacerlo, genera un respaldo manual y confirma que `.env.localdb` siga apuntando a `127.0.0.1:5433`.
- Los respaldos no son automáticos: no hay limpieza por antigüedad ni tarea programada activa.
