# ColdPower

Catálogo técnico de equipos y repuestos HVAC y línea blanca con búsqueda persistente, fichas técnicas y cotización asistida.

## Fuente del catálogo

El catálogo público se importa exclusivamente desde `../INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx`, hoja `IMPORT_PRODUCTOS` (1,348 filas). PostgreSQL/Neon es la fuente de verdad en runtime; Excel es solo fuente de importación y las hojas de auditoría nunca se publican como productos.

El importador es seguro por defecto y solo escribe usando `--apply`:

```bash
corepack pnpm install
corepack pnpm test:inventory
corepack pnpm import:inventory -- "..\\INVENTARIO CATALOGO\\ColdPower_Inventario_Final_Validado.xlsx"
```

## Migración, importación y QA de PostgreSQL

Configura `DATABASE_URL` en `.env.local` antes de persistir cualquier dato. No se debe usar `db:push`: el esquema se aplica exclusivamente mediante las migraciones reproducibles de Drizzle.

```bash
corepack pnpm db:migrate
corepack pnpm import:inventory --apply -- "..\\INVENTARIO CATALOGO\\ColdPower_Inventario_Final_Validado.xlsx"
corepack pnpm qa:inventory-db
corepack pnpm qa:inventory-data
```

Para comprobar idempotencia, vuelve a ejecutar exactamente el importador con `--apply`, después ejecuta nuevamente `qa:inventory-db`. La segunda ejecución debe informar `inserted: 0`, conservar 1,348 productos y no introducir SKU duplicados.

`qa:inventory-data` hace una lectura de la hoja `IMPORT_PRODUCTOS` y de PostgreSQL, y compara SKU, slugs, jerarquía categoría → familia, marca y cada especificación/campo de trazabilidad. Es de solo lectura: no cambia productos, cotizaciones ni dimensiones.

Si una base fue importada con una versión anterior que añadía el SKU a todos los slugs, primero revisa y luego aplica la reconstrucción transaccional:

```bash
corepack pnpm db:rebuild-product-slugs
corepack pnpm db:rebuild-product-slugs --apply
```

El comando conserva el SKU, usa el nombre normalizado como slug canónico y agrega SKU solo ante colisiones. También actualiza las referencias textuales de cotización afectadas; no modifica precios, stock, compatibilidades ni especificaciones.

El reporte del importador queda en `tmp/inventory-import-latest.json`, el de slugs en `tmp/product-slug-rebuild-latest.json`, el QA de conteos en `tmp/inventory-qa-latest.json` y el de integridad de campos en `tmp/inventory-data-integrity-latest.json`. No se deben versionar secretos ni datos de conexión.

Consulta [docs/migrations/inventory-database-runbook.md](docs/migrations/inventory-database-runbook.md) para el orden de ejecución, reinicio y rollback.

## Desarrollo local

```bash
corepack pnpm dev
```

Abrir http://localhost:3000.

## Preview y produccion

El entorno de preview puede mostrar estados de trabajo y datos comerciales pendientes, pero no debe confundirse con producción. Antes de publicar producción se deben completar los datos legales, contacto, dominio, políticas y aprobación editorial del catálogo. Usa `NEXT_PUBLIC_IS_PREVIEW=true` para preview y `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false` en producción.

## QA

```bash
corepack pnpm test:all
corepack pnpm test:inventory
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm build
```

Consulta `AGENTS.md` y `docs/superpowers/plans/2026-08-10-coldpower-inventory-database-migration.md` para las reglas de persistencia, trazabilidad, relaciones y verificación.
