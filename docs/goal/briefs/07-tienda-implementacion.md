# Brief 07 — Tienda: IMPLEMENTACIÓN del diseño aprobado (Codex)

Diseño aprobado por Claude: `docs/goal/designs/tienda/` (mockups + `spec.md` + `imagenes.md`), con estas **condiciones obligatorias**:
1. Logo real (`src/components/shared/BrandLogo.tsx`), nunca texto plano "COLDPOWER".
2. Home: sin frases decorativas en el hero ("La potencia que mantiene…", "Repuestos para un mayor mañana").
3. Carrito: solo productos con precio → precio real, subtotal y "Envío: por coordinar". Nunca "precio por confirmar" en el carrito.
4. Contadores de cabecera con el mismo color en desktop y móvil.
5. Catálogo móvil sin párrafo de marketing; catálogo desktop 4 tarjetas por fila a 1920.
6. Ficha con precio: monto real formateado; nunca inventar precio, stock ni specs (ocultar lo que no hay).

Lee completos `docs/goal/GOAL-IMPECABLE.md` (§3, §6, §7), `AGENTS.md`, `docs/goal/audits/tienda.md`, el spec y los mockups. Lee `node_modules/next/dist/docs/` antes de tocar caché/revalidación, `next/image`, metadata o route segments.

## Límites (tareas paralelas)
Otras tareas de Codex trabajan en el admin (`src/components/admin/**`, `src/app/admin/**`, `src/app/api/admin/**`, servicios de inventario/compras/gestión/comercial). **No los toques.** Tu alcance: `src/app/(páginas públicas)`, `src/components/{home,layout,catalog,product,shared,shopping-cart,checkout,cart,contact,auth,account,quote}/**`, `src/app/globals.css`, `next.config.ts`, `public/**`, y tests/contratos públicos. No toques `design-qa.md` ni `eslint.config.mjs`.

## Fases (en orden; al cerrar cada una: tsc + lint de tus archivos)
1. **Imágenes**: genera con `imagegen` el set de `imagenes.md` (hero desktop/móvil, categorías, familias, placeholders por familia, páginas informativas, og). WebP, hero ≤ 250 KB, tiles ≤ 80 KB. Convierte `home-v2-*.png` y logos pesados a WebP/SVG optimizados. Mapa de imagen por categoría/familia (preferible en código de mapeo claro; si agregas campo en BD, genera migración sin aplicarla). Chip "Imagen referencial" en toda imagen generada de producto/categoría.
2. **Fundaciones visuales**: tokens (contraste AA: CTA ámbar con texto navy; eyebrows `brand-secondary-600`; `warning-dark`), cabecera única, footer y bandas oscuras con superficie con profundidad (malla/grid técnico/ruido/foto a baja opacidad), `Button` con `next/link` para rutas internas, skip link, un solo `<main>`, variable `--header-h` para offsets sticky, movimiento (reveal con IntersectionObserver + CSS, hover, shimmer; `prefers-reduced-motion`).
3. **Home** según mockup: hero con buscador protagonista y chips, mosaico de categorías/familias, productos (tarjeta con 1 CTA), franja de 4 chips con icono (fusiona TechnicalSearchGuide/BenefitsBar/ApplicationSolutions), marcas en wordmark sin logos inventados, bloque "¿No lo encuentras? Envía foto de la placa" (WhatsApp). Elimina componentes muertos (Testimonials, BannerPair, ComplementsSection, FAQ viejo, data/testimonials, CSS de testimonios).
4. **Catálogo / categoría / buscar**: hero compacto ≤ 220 px, filtros en barra, orden que funciona en servidor, marcas filtradas por categoría, `aplicacion` mapeada o eliminada, 2 columnas móvil / 4 desktop, SKU exacto único → redirige a la ficha, paginación.
5. **Ficha**: variantes con/sin precio, specs sin dato ocultas, galería, sticky CTA móvil sin solaparse con WhatsApp/CompareBar, secciones vacías ocultas, JSON-LD Product/Offer/Breadcrumb, canonical, og:image, `React.cache` para no consultar dos veces.
6. **Carrito, checkout, cuenta, cotización**: barra sticky con total y CTA en móvil, confirmar "Vaciar carrito", asides con superficie, mismo lenguaje visual. No cambies la lógica de negocio del carrito/checkout/pago (solo presentación).
7. **Informativas**: FAQ, Nosotros (fotos, pasos en línea de tiempo, < 30 % del texto actual), Contacto (ya es referencia: solo alinear), Libro de reclamaciones (formulario real persistido y auditado, cumplimiento Indecopi: número correlativo, copia al consumidor), sign-in/up con panel de imagen, 404 con buscador y mosaico, `loading.tsx`/`error.tsx`/`global-error.tsx` públicos.
8. **Rendimiento y SEO**: quitar `force-dynamic` del layout raíz y de home/catálogo/categoría/ficha usando la caché/revalidación de Next 16 (mantener dinámico lo que depende de sesión: carrito, cuenta, checkout); tarjetas como server components con isla cliente solo para botones; títulos sin sufijo duplicado; ortografía (tildes y ¿).
9. **Tests**: reescribe los contratos públicos (`knownPublicRedesign` en `scripts/test-all.mjs` y la lista de `docs/goal/audits/tienda.md`) para validar comportamiento del nuevo diseño; que dejen de estar en "known" y pasen en `test:all`. Mantén `public-language-contract`.

## Verificación y reglas
Sin commit. Tests con `--test-timeout=60000`, sin `*:runtime`, sin servidores; aborta comandos > 3 min. Al final: `tsc --noEmit`, `corepack pnpm lint`, `node scripts/test-all.mjs`, y `corepack pnpm build`. Reporta por fase: archivos, decisiones, pendientes y riesgos. Claude hará la validación en navegador (1920/390, Lighthouse, escenarios de uso A1–A4 y C2/C5/C7).
