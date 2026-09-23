# Brief 08 — Imagen de producto correcta por familia (Codex) — PRIORIDAD

Bug visible en producción de preview: en el home ("Referencias para empezar") y demás listados, productos que NO son compresores (capacitor 25 µF, tarjeta LG 6871JB1103H, ventilador 12 V) muestran la foto de un compresor.

## Reglas
- Lee `AGENTS.md` y `docs/goal/GOAL-IMPECABLE.md`. **El home NO se rediseña** (Jean lo rechazó y se restauró desde git): no toques `src/app/page.tsx` ni `src/components/home/*` salvo lo estrictamente necesario para que la imagen del producto sea correcta.
- Si el producto tiene imagen real (media publicada), se usa esa.
- Si no tiene, se usa la imagen de relleno de **su familia**: `public/images/products/placeholder-<familia>.webp` (existen: compresores, capacitores, tarjetas-electronicas, motores-ventiladores, termostatos-controles, valvulas-filtros, refrigerantes, herramientas, resistencias, timers-sensores). Mapea por la familia/categoría real del producto en BD (slug o nombre normalizado); si la familia no corresponde a ninguna, usa una imagen neutra de categoría (`public/images/categories/<slug>.webp`) o `categories/repuestos-y-accesorios-generales.webp`. **Nunca** una familia distinta.
- Siempre con el chip "Imagen referencial" cuando es de relleno.
- Aplica en todos los lugares: `ProductMedia`, `ProductGallery`, `CartPageView`, tarjetas del home, catálogo, ficha, carrito, cotización y admin (`AdminProductCatalog`, `InventoryAdminWorkspace`, `PricingWorkspace`, `CartQuotePanel` usan aún `product-placeholder-repuesto.svg`: que usen la misma función).
- Una sola función compartida (p. ej. `src/lib/product-image.ts`) con test de comportamiento: capacitor→capacitores, tarjeta→tarjetas-electronicas, ventilador→motores-ventiladores, compresor→compresores, desconocido→genérico.
- Investiga por qué hoy sale compresor (¿fallback fijo? ¿media sembrada mal asociada?). Si hay datos de media mal asociados en BD de desarrollo, repórtalo (no borres datos reales).

## Verificación
Sin commit. `tsc`, lint de tus archivos, el test nuevo, `node scripts/test-all.mjs` (sin runtime ni servidores; tests con `--test-timeout=60000`). Reporta causa raíz, archivos y resultados.
