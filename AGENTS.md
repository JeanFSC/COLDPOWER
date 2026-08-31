<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# ColdPower

ColdPower is a technical catalog and quote workflow for refrigeration, HVAC and appliance parts.

## Persistent catalog rules

- `INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx`, sheet `IMPORT_PRODUCTOS`, is the only source for the public product catalog. The expected import is exactly 1,348 rows.
- Audit/control sheets are never imported as products: `EXCLUIDOS_USUARIO`, `FUENTE_ORIGINAL`, `VALIDACION_31`, `POSIBLES_DUPLICADOS` and `PENDIENTES_REVISION`.
- PostgreSQL/Neon is the source of truth. Do not reintroduce hardcoded product arrays, JSON-only catalogs, request-memory catalogs or silent in-memory fallbacks for product, cart or quote persistence.
- SKU is a unique, indexed and immutable commercial identifier. Imports must be idempotent and must update by SKU without changing the existing product ID or slug.
- Preserve every source column, including `NULL` values and review/duplicate/source metadata. Never invent price, stock, compatibility, availability, brand or technical values.
- The hierarchy is `category → family → product`; do not collapse family into category.
- Search and filtering must be server-side and support SKU, names, brand, model, category, family, application, refrigerant, voltage, power, capacitance and dimensions. Public lists must be paginated.
- Product relations are only explicit and validated. Same-family suggestions must be labeled as related, never as compatibility.
- Quote creation must be transactional. A successful response is allowed only after `quotes`, `quote_items` snapshots and status history are persisted; database failure returns an error.
- Before deleting the legacy catalog, create a recoverable backup and verify there are no runtime imports of it.

## Verification commands

```bash
corepack pnpm test:inventory
corepack pnpm exec tsx --test scripts/catalog-view-model.test.ts scripts/compatibility-safety.test.ts
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm build
```

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript 5
- Tailwind CSS v4
- Drizzle ORM + Neon PostgreSQL
- ESLint 9 + Prettier
- pnpm via Corepack (`corepack pnpm`)

## Development

```bash
corepack pnpm install
corepack pnpm dev
```

Open http://localhost:3000.

## Environment

Configure `DATABASE_URL` in `.env.local` before applying migrations or importing inventory. Never commit `.env.local` or other real secrets.
