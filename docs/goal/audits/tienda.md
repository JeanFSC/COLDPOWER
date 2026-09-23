# Auditoría Tienda pública — 2026-09-22

Rutas: `/`, `/buscar`, `/catalogo`, `/categoria/[slug]`, `/producto/[slug]`, `/comparar`, `/cotizacion`, `/carrito`, `/checkout`, `/cuenta/*`, `/faq`, `/nosotros`, `/contacto`, `/libro-de-reclamaciones`, `/sign-in|up`, `/pago/prueba/[ref]`, 404 · Rol: comprador (técnico en el celular)

## Tarea del usuario
El técnico tiene un código (ej. 6871JB1103H) y quiere, en ≤ 2 toques, saber si lo tienen, cuánto cuesta y si es la pieza correcta; luego comprar o cotizar. Hoy el buscador solo está en el header, la home abre con marketing y 11 bloques mayormente de texto, cada tarjeta tiene 3 CTAs, y faltan loading/error, JSON-LD y la fuente real.

## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| 1 | P1 | A11y | shared/Button.tsx:28; ContactPage.module.css:13; SearchBar.tsx:98 | CTA primario: blanco sobre ámbar #F59E0B = **2.15:1**. | Texto navy sobre ámbar (≈ 8.9:1) o ámbar más oscuro. |
| 2 | P1 | A11y | SectionTitle.tsx:46; TopBar.tsx:13; CompatibilityPanel.tsx:27; carrito/page.tsx:10-12; CartPageView.tsx:81,92; cuenta/page.tsx:53,196,275; ProductDetail.tsx:52,62 | Texto ámbar sobre blanco (eyebrows, enlaces); TopBar blanco 11 px sobre ámbar. | Eyebrows/enlaces en `brand-secondary-600`; ámbar solo como relleno con texto oscuro. |
| 3 | P1 | Función | catalogo/page.tsx:113-121; categoria/[slug]/page.tsx:153-161; catalog-repository.ts:24 | "Ordenar por" no se aplica. | Pasar `sort` al servidor. |
| 4 | P1 | UI | home/Hero.tsx:25-42 | Hero sin buscador; acción principal "Solicitar cotización". | Buscador protagonista con chips de ejemplo. |
| 5 | P1 | Rendimiento | public/images/home-v2-*.png (1.8 MB c/u); generated/*.png (1.5 MB); brand/logo-*.png (≈ 1 MB) | LCP de la home = PNG de 1.87 MB. | WebP/AVIF ≤ 250 KB; logo SVG. |
| 6 | P1 | Rendimiento | app/layout.tsx:22 + home, catálogo, categoría, producto, buscar, comparar, cotización | `force-dynamic` en el layout raíz: todo el sitio dinámico, sin caché. | Quitarlo; caché/revalidación Next 16. |
| 7 | P1 | UI | app/layout.tsx:20; globals.css:144-146 | IBM Plex no se carga (Arial). El test phase16:23 pasa en falso por un comentario. | `next/font/google` IBM_Plex_Sans/Mono. |
| 8 | P1 | Estados | (no existen) | Sin `loading.tsx`, `error.tsx` ni `global-error.tsx` públicos. | Skeletons con brillo y error con reintentar. |
| 9 | P1 | Legal | libro-de-reclamaciones/page.tsx:23,30 | "Estado: próximamente / Canal por implementar" con la tienda cobrando (Indecopi). | Formulario real persistido. |
| 10 | P2 | UI | HomeProductCard.tsx:97-115; ProductCard.tsx:62-71 | 3 CTAs + Comparar por tarjeta. | Tarjeta clicable, 1 CTA, comparar como icono. |
| 11 | P2 | UI | TransactionBox.tsx:34-54 | Hasta 4 botones y 5 frases. | 1 primario + 1 secundario; condiciones como chips. |
| 12 | P2 | Mobile | ProductDetail.tsx:70; WhatsAppFloatingLeadButton.tsx:22; CompareBar.tsx:13 | WhatsApp flotante y CompareBar tapan la barra sticky. | Reubicar cuando haya barra sticky. |
| 13 | P2 | Mobile | ProductAnchors.tsx:15; ProductDetail.tsx:32; CatalogFilters | Offsets sticky menores que el header. | Variable `--header-h`. |
| 14 | P2 | Mobile | ProductGrid.tsx:21 | 1 columna en móvil (~600 px por tarjeta). | 2 columnas con tarjeta compacta. |
| 15 | P2 | A11y | ProductDetail.tsx:22; faq/page.tsx:21; ContactPage.tsx:66 | `<main>` anidado; sin skip link. | `<div>` + "Saltar al contenido". |
| 16 | P2 | A11y | catalogo/page.tsx:45,68; faq/page.tsx:24-31; BenefitsBar.tsx:62 | Encabezados desordenados (2×h1, h2 antes de h1). | Un h1, jerarquía en orden. |
| 17 | P2 | A11y | MobileMenu.tsx:80; MobileFilterDrawer.tsx:87 | Sin foco atrapado, sin Escape ni `role=dialog`. | Diálogo accesible. |
| 18 | P2 | UI | globals.css; CompatibilityPanel.tsx:15; ProductGallery.tsx:61 | `text-warning-dark` no existe. | Definir token. |
| 19 | P2 | Rendimiento | Button.tsx:56-64 | `<a>` en vez de `next/link`: recarga completa. | `Link` interno. |
| 20 | P2 | Rendimiento | producto/[slug]/page.tsx:17,46 | Producto consultado 2 veces. | `React.cache`. |
| 21 | P2 | Rendimiento | HomeProductCard.tsx:1; ProductCard.tsx:1; CatalogUnavailable.tsx:1; Header.tsx:1 | Tarjetas enteras `"use client"`. | Server component + isla de botones. |
| 22 | P2 | SEO | producto/[slug]/page.tsx:20; layout.tsx:40 | Sin JSON-LD Product/Offer/Breadcrumb, sin og:image, sin canonical. | Agregarlos. |
| 23 | P2 | SEO | nosotros/page.tsx:18; sign-in/page.tsx:8 | Título "X \| ColdPower \| ColdPower". | Quitar sufijo. |
| 24 | P2 | Función | categoria/[slug]/page.tsx:162 | Filtro de marca lista todas las marcas. | Solo marcas de la categoría. |
| 25 | P2 | Función | ApplicationSolutions.tsx:45; catalogo/page.tsx:134 | `?aplicacion=` como texto libre. | Mapear a categoría/familia real o quitar. |
| 26 | P2 | UI | nosotros/page.tsx:43; public/images/cat-*.svg, product-placeholder-repuesto.svg, etc. | Tema viejo naranja #F2620B / teal #0FB5A6 sobre #0E1320. | Nuevo set navy/azul/ámbar. |
| 27 | P2 | Mobile | CartPageView.tsx:93,97 | Sin CTA sticky en carrito; "Vaciar" sin confirmación. | Barra sticky total + CTA; confirmar. |
| 28 | P2 | UI | ProductDetail.tsx; SearchBar.tsx; catalogo; buscar; cotizacion; not-found; CatalogUnavailable; MobileFilterDrawer | Faltan tildes y "¿" ("Catalogo", "Descripcion", "codigo"…). | Ortografía. |
| 29 | P2 | UI | ProductDetail.tsx:59-63; ProductGallery.tsx:53-66 | Secciones vacías de relleno como anclas. | Ocultar sin datos. |
| 30 | P2 | UI | FinalCTA.tsx:8; faq/page.tsx:22; Footer.tsx:31; CartPageView.tsx:97; CheckoutForm.tsx:239 | Bandas y paneles navy planos. | Malla, grid técnico, ruido o foto a baja opacidad. |
| 31 | P3 | UI | Hero.tsx:48-50; PromoBanner.tsx:30; Footer.tsx:36; cuenta/page.tsx:207 | "Tu proyecto, nuestro respaldo" ×4, cursiva rotada. | Una sola vez, sin cursiva. |
| 32 | P3 | UI | Hero.tsx:27; SectionTitle.tsx:46; PublicPageHeader.tsx:9; HomeFaq.tsx:41; AuthCard.tsx:15 | Eyebrows inconsistentes. | Mono 11 px `brand-secondary-600`. |
| 33 | P3 | Tests/UI | Testimonials, BannerPair, ComplementsSection, FAQ, data/testimonials.ts; globals.css:202-259 | Componentes y CSS muertos. | Borrar con sus tests. |
| 34 | P3 | UI | cuenta/page.tsx:53,180,216,315 | Misma imagen dos veces; ámbar sobre celeste. | Imagen distinta, tokens coherentes. |
| 35 | P3 | UI | not-found.tsx | 404 sin buscador ni imagen. | 404 con buscador y categorías. |
| 36 | P3 | A11y | CategoryCard.tsx:28 | `alt` repite el h3. | `alt=""`. |

Densidad: home ≈ 330 palabras en 11 bloques (TechnicalSearchGuide, BenefitsBar y ApplicationSolutions repiten idea); ficha ≈ 12 frases fijas; nosotros ≈ 350 palabras sin fotos. **Contacto es la referencia visual a seguir** (3 WebP livianos).

## Brief de rediseño (prioridad)
1. **Home**: hero foto técnica + malla navy, h1 corto ("Encuentra tu repuesto por código"), buscador ~64 px con chips (R404A, Embraco, 6871JB1103H), 1 CTA secundario → mosaico de 8 categorías/familias con foto a sangre + contador → carrusel de productos (2 col móvil) → una franja de 4 chips con icono (fusiona los 3 bloques de texto) → marcas en wordmark mono (sin logos inventados) → "¿No lo encuentras? Envía foto de la placa" → FAQ fuera de la home. Reveal con IntersectionObserver + CSS, `prefers-reduced-motion`.
2. **Ficha**: galería grande con chip "Imagen referencial" en toda imagen generada; precio/disponibilidad como chips; 1 primario; specs en grid de chips; sin secciones vacías; JSON-LD; sticky sin solapes.
3. **Catálogo/categoría/buscar**: cabecera con foto de familia a baja opacidad sobre navy + grid técnico; chips de familias con miniatura; 2 col móvil; orden funcional; SKU exacto único → directo a la ficha.
4. **Carrito/checkout**: barra sticky con total, miniaturas, aside navy con textura.
5. **FAQ/Nosotros**: fotos de almacén, técnico, mostrador; pasos como línea de tiempo; < 30 % del texto actual.
6. **Cuenta/auth/404**: panel con imagen en sign-in/up; 404 con buscador y mosaico.

## Set de imágenes a generar
WebP 1600×1000 ≤ 180 KB; tiles 800×800 ≤ 80 KB. Paleta navy #0B2239, azul #0F6FAE, acento ámbar. Sin logos de marcas reales. Siempre con chip "Imagen referencial" en producto/categoría.
- Hero y superficies: `home/hero-tecnico-hvac.webp`, `home/hero-tecnico-hvac-mobile.webp` (900×1200), `home/placa-equipo-ayuda.webp`, `surfaces/navy-mesh.webp`, `surfaces/grid-tecnico.svg`, `surfaces/noise.png`.
- Categorías `categories/<slug>.webp`: refrigeracion, aire-acondicionado, lavadora, secadora, cocina, campana-extractora, extractor, terma, bomba-de-agua, motores-automotrices, licuadora, hervidor, arrocera, plancha, lustradoras, otros-electrodomesticos, repuestos-y-accesorios-generales.
- Familias `families/<slug>.webp`: compresores, capacitores, tarjetas-electronicas, motores-ventiladores, termostatos-controles, valvulas-filtros, refrigerantes, herramientas, resistencias, timers-sensores.
- Placeholders `products/placeholder-<familia>.webp`.
- Páginas: `about/almacen.webp`, `about/asesor-mostrador.webp`, `about/despacho.webp`, `faq/hero-ayuda.webp`, `auth/panel-tecnico.webp`, `404/repuesto-perdido.webp`, `og/og-default.jpg` (1200×630).
- Logos: `brand/logo-coldpower.svg`, `brand/logo-coldpower-light.svg` (vectorizar el actual, no rediseñar).

## Plan de corrección
1. Fundaciones: next/font, contraste (Button, eyebrows), token warning-dark, skip link, `<main>` único, Button con `Link`.
2. Rendimiento: quitar `force-dynamic`, `cache()`, WebP, logos SVG, tarjetas server.
3. Estados: loading/error públicos + 404 nuevo.
4. Función: sort, marcas por categoría, aplicación.
5. Imágenes: generar set; mapa en CategoriesGrid.tsx:7-18 (mejor: imagen por categoría en BD).
6. Home, 7. Ficha, 8. Resto de páginas + superficies con textura, 9. Ortografía y SEO.

## Tests de contrato a reescribir (comportamiento, no strings)
hero-visual-contract (**hoy falla**), phase8-visual-readiness (**hoy falla**), phase17-home-catalog-first (**hoy falla**), phase3-home-structure, phase16-navigation-design (regex falsa de fuente), phase19-product-detail, phase22-seo-faq-media, cp026b-public-ui-contract, public-language-contract (mantener), y los que leen estos archivos: cp026b-shell-contract, catalog-prefetch-performance, phase4-catalog-structure, phase6/7, cp061-public-account, contact-page-contract.

## Criterio de aceptación
- Anónimo 1920×1080 y 390: SKU en el hero → ficha en ≤ 2 toques; ningún bloque con > 1 frase; sin bandas planas; reveal desactivado con reduced-motion.
- A11y: sin fallos de contraste (axe/Lighthouse); un h1; teclado en menú y filtros; skip link.
- Ficha: sticky sin solapes, 1 CTA primario, JSON-LD válido.
- Catálogo: orden funciona; 2 col móvil; marcas filtradas por categoría.
- Estados: skeleton y error.tsx con BD cortada; 404 con buscador.
- Lighthouse móvil (build): LCP < 2.0 s, CLS < 0.05, TBT < 150 ms, Performance ≥ 90 en `/`, `/catalogo`, `/producto/*`. Ninguna imagen pública > 250 KB.
- `grep -ri "F2620B\|0FB5A6\|242,98,11" src public` vacío. `test:all`, `tsc`, `lint` verdes.

## Contratos públicos reescritos para el diseño aprobado

`test-all` ejecuta estos contratos como bloqueante, fuera de cualquier lista `known`:

- `scripts/tienda-public-contract.test.mjs`: cabecera única, home, tarjetas, catálogo, ficha, carrito, informativas, estados, accesibilidad y peso de assets.
- `scripts/cp026b-public-ui-contract.test.mjs`: anatomía pública, tokens y copy honesto.
- `scripts/cp026b-shell-contract.test.mjs`: shell compartido desktop/mobile, contadores y footer.
- `scripts/catalog-prefetch-performance.test.mjs`: límites de prefetch de navegación pública.
- `scripts/hero-visual-contract.test.mjs`: hero responsive, imagen generada y CTA `Buscar`.
- `scripts/phase3-home-structure.test.mjs`, `phase4-catalog-structure.test.mjs`, `phase6-v1-readiness.test.mjs`, `phase7-preproduction.test.mjs`, `phase8-visual-readiness.test.mjs`, `phase16-navigation-design.test.mjs`, `phase17-home-catalog-first.test.mjs`, `phase22-seo-faq-media.test.mjs`: contratos por fase alineados al nuevo storefront.
