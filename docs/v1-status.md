# Estado V1 ColdPower

## Qué está implementado

- Home comercial con hero, beneficios, categorías, productos destacados, promoción, testimonios, FAQ y CTA final.
- Catálogo frontend con filtros por categoría, marca, disponibilidad, búsqueda visual y ordenamiento.
- Páginas de categoría y detalle de producto con datos mock, CTA de cotización y WhatsApp centralizado.
- Buscador por query param con resultados desde productos mock.
- Flujo de cotización con validación cliente/servidor, API temporal y código `quoteId`.
- Páginas institucionales: Nosotros, Contacto, Libro de reclamaciones placeholder y página 404 personalizada.
- Datos comerciales centralizados en `src/data/company.ts` y sedes en `src/data/branches.ts`.
- Preparación de preproducción con variables de entorno, headers básicos, robots, sitemap y rate limit temporal.

## Rutas disponibles

- `/`
- `/catalogo`
- `/categoria/[slug]`
- `/producto/[slug]`
- `/buscar`
- `/cotizacion`
- `/api/cotizacion`
- `/nosotros`
- `/contacto`
- `/libro-de-reclamaciones`
- `not-found`

## Qué sigue siendo mock

- Productos, precios, stock y compatibilidad.
- Sedes, teléfono, WhatsApp, correo, RUC y redes sociales.
- Registro de cotizaciones: la API valida y responde, pero no persiste.
- Rate limiting de cotizaciones en memoria: útil como protección temporal, insuficiente para serverless distribuido.
- Envío de email, CRM, mapas y operación comercial real.

## Cómo correr el proyecto

```bash
pnpm install
pnpm dev
```

Servidor local esperado:

```bash
http://127.0.0.1:3000
```

## Validaciones

Comandos principales:

```bash
pnpm test:phase3
pnpm test:phase4
pnpm test:phase5
pnpm test:phase6
pnpm test:phase7
pnpm lint
pnpm build
```

## Pendientes para producción

- Reemplazar datos mock por fuente real o CMS aprobado.
- Persistir cotizaciones en base de datos o CRM.
- Configurar envío real de email o notificaciones internas.
- Definir datos legales reales: RUC, dirección, políticas y términos.
- Reemplazar placeholders por fotografías/productos finales.
- Reemplazar rate limiting en memoria por protección compartida o proveedor especializado si hay múltiples instancias.

## Próxima fase recomendada

Fase 8 debería enfocarse en operación real de cotizaciones: persistencia, email/CRM, trazabilidad comercial, anti-spam robusto y datos legales finales.
