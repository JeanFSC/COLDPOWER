# ColdPower

Tienda online peruana para venta de **equipos y repuestos de refrigeración, aire acondicionado (distribuidor Carrier) y línea blanca**, con catálogo navegable, ficha técnica, búsqueda, cotización asistida y **WhatsApp como canal principal de conversión**.

> Estado actual: **V1 comercial navegable + preview readiness**. La cotización usa una API temporal sin persistencia. Productos, precios, stock y datos comerciales son **mock** mientras no se configuren datos reales.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript 5**
- **Tailwind CSS v4**
- ESLint 9 + Prettier
- lucide-react, clsx, tailwind-merge
- Gestor de paquetes: **pnpm**

Sin base de datos, CMS, auth, pagos ni backend real (V1 por diseño).

## Rutas principales

- `/` — Home
- `/catalogo` — catálogo con filtros, orden y paginación
- `/categoria/[slug]` — categoría
- `/producto/[slug]` — ficha de producto
- `/buscar` — búsqueda (`/buscar?q=compresor`)
- `/cotizacion` — cotización asistida
- `/api/cotizacion` — API temporal de cotización (sin persistencia)
- `/nosotros`, `/contacto`, `/libro-de-reclamaciones`
- `/robots.txt`, `/sitemap.xml`

## Instalación

```bash
pnpm install
```

## Desarrollo

```bash
pnpm dev
```

Abrir http://localhost:3000

## Validación

```bash
# Tests por fase
pnpm test:phase3
pnpm test:phase4
pnpm test:phase5
pnpm test:phase6
pnpm test:phase7
pnpm test:phase8
pnpm test:phase9a
pnpm test:phase9a2
pnpm test:phase9a3

# Todos los tests de fase de una vez
pnpm test:all

# Lint y build
pnpm lint
pnpm build
```

## Variables de entorno

- Copia `.env.example` a `.env.local` para desarrollo local.
- Para **preview privado** usa `.env.preview.example` como referencia.
- **Nunca** subas `.env.local` (ni ningún `.env` real) al repositorio. Solo los archivos `*.example` están versionados.

Variables clave de protección de datos:

| Variable | Desarrollo / Preview | Producción |
| --- | --- | --- |
| `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA` | `true` | `false` |
| `NEXT_PUBLIC_IS_PREVIEW` | `true` | `false` |

En producción, con `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false`, el build **falla de forma controlada** si quedan datos placeholder críticos (WhatsApp, correo, teléfono, RUC). Ver `src/lib/env.ts`.

## Deploy preview

Resumen: importar el repo en Vercel (framework Next.js, install `pnpm install`, build `pnpm build`), cargar las variables de `.env.preview.example` en scope **Preview** con `NEXT_PUBLIC_IS_PREVIEW=true`. Aparece un banner de "Vista previa privada". **No compartir públicamente.**

Detalle completo: [docs/deploy-preview-checklist.md](docs/deploy-preview-checklist.md).

## Producción

Antes de publicar como producción real son **obligatorios** datos reales:

- WhatsApp, correo, teléfono, RUC reales.
- Dirección/sede real.
- Redes sociales reales (o dejarlas vacías; no se renderizan enlaces mock).
- Dominio real (`NEXT_PUBLIC_SITE_URL`).
- Políticas legales reales y libro de reclamaciones validado.
- `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false` y `NEXT_PUBLIC_IS_PREVIEW=false`.

Ver [docs/deployment.md](docs/deployment.md) y [docs/production-checklist.md](docs/production-checklist.md).

> **Advertencia:** mientras no se configuren, productos, precios, stock, RUC, WhatsApp, correo y sedes siguen siendo **mock**.

## Licencia / propiedad

Proyecto interno de **ColdPower**. No usar assets, textos ni código de terceros sin permiso. No se utilizan imágenes, textos, logo ni marca de terceros.
