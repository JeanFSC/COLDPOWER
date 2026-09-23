# Brief 03 — Tienda: FASE DE DISEÑO (Codex). No implementes código.

Lee completo `docs/goal/GOAL-IMPECABLE.md` (§3, §6, §7, §8), `AGENTS.md` y `docs/goal/audits/tienda.md`. Referencia visual existente que sí funciona: `/contacto` (`src/components/contact/*`, imágenes `public/images/contact-*.webp`). Revisa también `docs/qa/public-home-v2-redesign-2026-09-22.md` (trabajo paralelo de otra sesión sobre el home) para no contradecirlo.

## Entregables (solo en `docs/goal/designs/tienda/`)
1. **Mockups de alta fidelidad** generados con la skill `imagegen` (o `product-design:ideate`), 1920×1080 y 390×844, para:
   - `home-desktop.png`, `home-mobile.png`
   - `ficha-desktop.png`, `ficha-mobile.png`
   - `catalogo-desktop.png`, `catalogo-mobile.png`
   - `carrito-checkout-mobile.png`
   - `superficies.png` (muestra de bandas oscuras con profundidad: malla navy, grid técnico, foto a baja opacidad, ruido — reemplazo de FinalCTA, Footer, FAQ, asides)
2. **Guía de imágenes** `imagenes.md`: estilo (foto de estudio/técnica realista, fondo claro o navy, acento ámbar, sin logos de marcas reales), 3 imágenes de prueba generadas (`muestra-categoria-refrigeracion.webp`, `muestra-familia-compresores.webp`, `muestra-hero.webp`) y la lista completa del set (ver auditoría) con nombres de archivo.
3. **Spec** `spec.md`: por página, secciones en orden con propósito (≤ 1 frase de texto visible por bloque), componentes a crear/reusar, tokens (contraste: CTA ámbar con texto navy; eyebrows en `brand-secondary-600`), movimiento (reveal IntersectionObserver + CSS, hover, shimmer, `prefers-reduced-motion`), estados (loading/error/vacío/404) y comportamiento móvil (2 columnas, CTA sticky sin solapes con WhatsApp/CompareBar).

## Reglas
- Buscador protagonista en el hero; tarjeta de producto con 1 CTA; más imagen que texto.
- Nunca inventar precio, stock, marcas ni logos. Toda imagen generada de producto/categoría lleva chip "Imagen referencial".
- Paleta: navy #0B2239, azul #0F6FAE, ámbar #F59E0B (relleno, texto oscuro encima), superficie #F4F7F9.
- **Detente al terminar el diseño.** Claude lo audita y te enviará la orden de implementar.

Reporta rutas de los archivos generados y decisiones clave.
