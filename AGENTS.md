<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# ColdPower

ColdPower is a technical catalog and quote workflow for refrigeration, HVAC and appliance parts.

## Ticket execution standard

- Antes de iniciar cualquier ticket, leer por completo las instrucciones y todos los archivos o referencias adjuntos.
- Para cuadros, ilustraciones o visuales genéricos que formen parte del entregable, usar la skill de generación de imágenes y aplicar el resultado al producto; no sustituirlos por placeholders o arte improvisado.
- Cuando exista una referencia visual seleccionada, implementarla con fidelidad profesional (composición, jerarquía, proporciones, espaciado, tipografía, color, estados y responsive). Si la referencia es ambigua o no corresponde al módulo solicitado, detener la implementación visual y solicitar la referencia correcta.
- En toda tarea visual, actuar simultáneamente como **Senior Product Designer** y **Frontend Engineer de alta fidelidad**. Tratar la captura o referencia como especificación, no como inspiración: medir alineaciones, ejes, bordes, dimensiones, espaciados y densidad antes de editar; identificar el defecto exacto; cambiar únicamente el elemento necesario; y no declarar el resultado terminado sin validación visual en el navegador del usuario. No sustituir esa validación por intuición, compilación o una respuesta HTTP.
- Verificar las interfaces usando el navegador del usuario cuando corresponda, incluyendo las interacciones principales, estados relevantes y consola; no considerar suficiente que compile o que el servidor responda.
- Entregar trabajo profesionalmente terminado: validar funcionalidad, accesibilidad, responsive, calidad visual y pruebas antes de cerrar el ticket.

## Mandatory product-design workflow

- Siempre que una tarea implique crear, rediseñar o editar visualmente una interfaz, página, componente, dashboard, menú, modal, drawer, formulario, tabla, visualización o cualquier elemento que necesite decisiones de diseño, usar primero la skill `product-design:image-to-code`. Esta regla también aplica a ajustes parciales de estilos, distribución, responsive, estados o interacciones sobre diseños existentes. No implementar directamente una solución visual sin aplicar antes este proceso.
- Interpretar la solicitud, la referencia y el contexto del producto antes de diseñar. La skill debe usarse con la lógica funcional correcta para el caso solicitado; no copiar una imagen de forma mecánica ni agregar interacciones, datos o estados que contradigan el dominio.
- Para toda creación, rediseño o edición de diseño, resolver primero la propuesta visual: jerarquía, composición, densidad, estados, interacciones, accesibilidad y comportamiento responsive. Implementar el código después de definir esa solución.
- Antes de considerar terminado un diseño, evaluarlo explícitamente con estas preguntas: ¿es atractivo para el usuario?, ¿es eficiente?, ¿es responsive?, ¿es fácil de usar? Si alguna respuesta es negativa o dudosa, iterar el diseño antes de cerrar la tarea.
- La resolución principal del usuario es `1920 × 1080` con zoom del navegador al `100%`. Diseñar y hacer la comparación visual principal en esas condiciones, garantizando además una adaptación correcta para resoluciones menores y dispositivos móviles.
- La validación final debe realizarse en el navegador con el viewport principal de `1920 × 1080`, zoom `100%`, y debe revisar fidelidad visual, contenido real, estados vacíos/carga/error, navegación por teclado, interacciones principales, desbordamientos y consola.

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

## Browser validation

- Toda comprobación visual se realiza siempre en el navegador personal de Jean con su sesión autenticada en ColdPower. No usar una ventana aislada, una captura estática, compilación ni una respuesta HTTP como sustituto de esa validación.
- Tratar las pestañas existentes del usuario como contexto de trabajo: no navegar, recargar ni cambiar su estado salvo que la prueba lo requiera. Para pruebas que necesiten una ruta o estado independiente, abrir una pestaña de trabajo dentro del mismo navegador y perfil autenticado.

## Visual data fixtures

- Si Jean solicita una visualización y faltan series, históricos o estados para que se renderice, crear y aplicar una fixture de desarrollo que muestre el estado pedido. Debe ser idempotente, estar protegida contra ejecución en producción y vivir en un script reutilizable.
- Nunca presentar esa fixture como dato operativo real ni usarla para contaminar producción; la validación visual local debe aun así mostrar el resultado solicitado en lugar de dejar un estado vacío.

## Environment

Configure `DATABASE_URL` in `.env.local` before applying migrations or importing inventory. Never commit `.env.local` or other real secrets.
