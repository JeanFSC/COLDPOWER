# Brief 15 — Cierre del home espejo y de la tienda pública (Codex)

Lee `AGENTS.md`, `docs/goal/designs/home-espejo/prompt-jean.md` (el prompt ÍNTEGRO de Jean) y la imagen `docs/goal/designs/home-espejo/referencia.png` (adjunta). Rama `codex/goal-impecable`.

## Entorno
- Base de datos **local**: `DATABASE_DRIVER=pg`, `.env.localdb`.
- Claude mantiene `corepack pnpm dev:local` en el 3002. Úsalo; no lo reinicies salvo que sea necesario.
- **Nunca** conectes a Neon.

## Reglas de evidencia (obligatorias)
- "Validado" solo cuenta con una captura real adjunta en `docs/goal/evidencia/15/` (Playwright a 1920×1080 y 390×844, con `fullPage` y scroll previo para cargar las imágenes lazy).
- No edites una prueba de contrato en la misma tarea que cambia lo que esa prueba cubre sin justificarlo por escrito en el informe (qué asertaba, por qué ya no aplica).
- Las pruebas nuevas verifican comportamiento, no texto del código fuente.

## Tareas
1. **Home, ronda 4:**
   - el logo del header muestra un rectángulo gris de fondo detrás del lockup; debe verse sobre blanco como en la referencia;
   - la pestaña "En oferta" sale vacía aunque existe una promoción activa en la base local: corrige el view-model o la consulta y verifica que la lista coincide con los productos cubiertos por esa promoción;
   - compara con la referencia a 1920 sección por sección y deja `comparacion-r4.png`.
2. **Header y footer nuevos en toda la tienda.** Recorre a 1920 y 390:
   - `/catalogo`, `/categoria/[slug]`, `/buscar`, `/producto/[slug]`, `/comparar`;
   - `/carrito`, `/cotizacion`, `/checkout`, `/pago`;
   - `/cuenta` (y `pedidos/[code]`), `/sign-in`, `/sign-up`;
   - `/contacto`, `/faq`, `/nosotros`, `/libro-de-reclamaciones` y 404.

   Corrige desbordes, solapes, tamaños y consola. Captura cada página.
3. **Catálogo:** a anchos medios aparecen "4 referencias encontradas" y "4 REFERENCIAS DISPONIBLES" duplicados; deja un solo contador.
4. **Imágenes huérfanas:**
   - script `scripts/find-unused-public-assets.mjs` que lista los archivos de `public/` no referenciados;
   - borra las del home rechazado (`public/images/home/hero-tecnico-*`, etc.) solo si el script confirma que no se usan.
5. **Lint:** elimina las 12 advertencias y deja `corepack pnpm lint` con 0 advertencias.
6. **`test-all` verde:** hoy se detiene en el contrato que espera `prefetch={false}` en `ProductSection.tsx`. Decide con criterio (comportamiento de prefetch correcto) y justifica. Solo se acepta el fallo del Excel externo.

## Verificación
- Sin commit.
- `tsc`, lint (0/0), `test-all` y `build` con `.env.localdb`.
- Reporta:
  - tabla de páginas × viewport (✅/❌ + ruta de captura);
  - defectos corregidos;
  - archivos cambiados;
  - contratos modificados con su justificación.
