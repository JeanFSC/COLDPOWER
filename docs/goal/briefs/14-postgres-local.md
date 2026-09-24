# Brief 14 — Base de datos local para desarrollo (Codex)

## Contexto
- Neon está fuera de cuota (HTTP 402: "exceeded the quota"). No se puede leer ni exportar hasta que Jean suba de plan.
- Jean necesita seguir trabajando con datos **ya**.
- En local existen:
  - `tmp/backups/cp025-pre-migration-2026-09-23T23-19-56-959Z.json`: respaldo lógico con categories 27, families 171, brands 60, products 1348, users 22, quotes 128, quoteItems 128, quoteStatusHistory 128 y quoteCarts 138;
  - las migraciones `drizzle/*.sql` (0000–0051);
  - los scripts de fixtures de desarrollo en `scripts/seed-*.ts`.

Lee `AGENTS.md`. Rama `codex/goal-impecable`.

## Objetivo
Un entorno de desarrollo que use **PostgreSQL local** en lugar de Neon, activable por configuración, sin tocar la configuración de Neon (`.env.local`) ni el comportamiento de producción.

## Tareas
1. **PostgreSQL portátil, sin instalador ni admin.**
   - Descarga los binarios zip oficiales de EnterpriseDB para Windows x64 (PostgreSQL 17) a `C:\Users\jean_\pg17\`.
   - `initdb` con datos en `C:\Users\jean_\pgdata-coldpower\`, UTF8, locale C, usuario `coldpower` con contraseña local.
   - Arráncalo en `127.0.0.1:5432` con `pg_ctl`.
   - Scripts en `ops/`: `pg-local-start.ps1`, `pg-local-stop.ps1` y `pg-local-status.ps1`. **Nada de binarios ni datos dentro del repo.**
2. **Driver conmutables.**
   - `src/db/index.ts` hoy usa `@neondatabase/serverless` (WebSocket), que no habla con un Postgres local.
   - Añade el soporte `DATABASE_DRIVER=pg` → `drizzle-orm/node-postgres` con `pg.Pool`, y agrega la dependencia `pg` + `@types/pg`.
   - Por defecto (sin la variable) el comportamiento es **idéntico** al actual (Neon).
   - Busca y cubre otros usos directos del driver de Neon (`neon(`, `Pool` de `@neondatabase/serverless`, `neonConfig`) en `src/` y `scripts/` que corran en desarrollo, incluidos `migrate-database.ts` y `backup-database.ts`.
3. **Entorno.**
   - Crea `.env.localdb` (gitignored). Copia de `.env.local` con `DATABASE_URL=postgres://coldpower:…@127.0.0.1:5432/coldpower` y `DATABASE_DRIVER=pg`; conserva el resto de claves (Clerk, etc.).
   - Añade a `package.json` los scripts:
     - `db:local:migrate`
     - `db:local:restore`
     - `db:local:seed`
     - `dev:local` (puerto 3002, con el bypass de auth de desarrollo como hoy)
     - `start:local`
   - Todos van con `dotenv -e .env.localdb`.
4. **Esquema.** Aplica todas las migraciones 0000–0051 a la base local con el migrador del proyecto.
5. **Restauración.** Script `scripts/restore-local-from-backup.ts`:
   - carga el JSON en orden de FK (users, categories, families, brands, products, quote_carts, quotes, quote_items, quote_status_history);
   - es idempotente (upsert por PK);
   - **se niega a correr si la URL no es localhost**.
   - Conserva IDs, slugs y SKU exactos. Verifica los conteos contra el JSON.
6. **Fixtures.**
   - Ejecuta los seeds de desarrollo existentes necesarios para que la tienda y el admin tengan datos: precios, inventario, pedidos, pagos, compras, CRM, promociones, notificaciones y `seed-home-espejo`.
   - Si algún seed bloquea por la protección de entorno, amplía la protección para permitir localhost **sin relajar la protección de producción**.
   - Documenta el orden en `docs/dev/base-local.md`.
7. **Verificación.**
   - `dev:local` levanta en 3002 y el home muestra categorías, 6 + 6 productos, tabs y marcas desde la base local.
   - El admin carga con SUPERADMIN.
   - `tsc`, lint (0 errores) y los tests sin DB en verde.
   - Los tests con DB se corren contra la base local cuando apliquen.
   - Deja el servidor 3002 corriendo al terminar para la revisión de Claude.

## Reglas
- **No toques `.env.local` ni intentes conectar a Neon.**
- Sin commit.
- `.env.localdb`, `C:\Users\jean_\pg17` y `pgdata-coldpower` nunca van al repo.
- Reporta:
  - conteos restaurados;
  - seeds ejecutados;
  - archivos cambiados;
  - cómo arrancar y parar;
  - riesgos.
