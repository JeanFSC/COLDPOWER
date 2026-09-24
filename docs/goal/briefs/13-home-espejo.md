# Brief 13 — Home ESPEJO 1:1 de la referencia de Jean (Codex)

Jean ordenó reconstruir el home como **espejo exacto** de su imagen: "NECESITO QUE SE VEA IGUAL".

- Imagen objetivo (adjunta a esta orden): `docs/goal/designs/home-espejo/referencia.png` (984 × 1599).
- Prompt íntegro de Jean: `docs/goal/designs/home-espejo/prompt-jean.md`. Léelo completo; es la especificación.
- Si el texto y la imagen difieren, **manda la imagen**.

Esta orden reemplaza la regla anterior de "no tocar el home".

Lee también `AGENTS.md` y `docs/goal/GOAL-IMPECABLE.md`. Rama `codex/goal-impecable`.

Hay cambios sin commit de la QA (brief 12) en el árbol: `globals.css`, `AppChrome`, `PreviewBanner`, `ProductCard`, contacto, cotización y `AdminShell`.
- **Consérvalos**; no los reviertas.
- Los que tocan `page.tsx`, `Hero` y `PromoBanner` quedan sustituidos por el espejo.

## Única desviación permitida: honestidad de datos (AGENTS.md, innegociable)
El diseño se copia 1:1, pero el contenido sale de la base de datos real. Nunca se inventa precio, stock, marca ni compatibilidad.

- **Precio rojo.** Solo el precio RETAIL activo real, con la función compartida (`loadRetailPricesWithPromotions`).
  - Sin precio: el mismo espacio muestra "Precio bajo cotización" en el mismo estilo tipográfico, pero sin rojo.
  - El botón naranja full width dice "🛒 Agregar" si el producto es comprable. Si no, dice "Cotizar" con el mismo tamaño y color.
- **Badges.**
  - "Más vendido" solo si sale de ventas reales.
  - "Nuevo" solo si es un ingreso reciente real (define la regla, p. ej. `created_at` en los últimos N días).
  - Oferta solo con una promoción activa real.
- **Tabs.** "Más vendidos / Nuevos ingresos / En oferta / Recomendados" van respaldados por consultas reales en el servidor.
  - Si una tab no tiene datos, muestra un estado vacío honesto dentro de la misma altura.
  - Las tabs deben funcionar: cambian el grid sin recargar toda la página, y son accesibles con teclado.
- **Corazón.** Debe hacer algo real (favoritos persistidos para usuarios con sesión) o no se muestra. Si lo implementas, que persista en la base de datos.
- **Categorías, "Busca por el trabajo…" y navegación.** Enlazan a filtros reales del catálogo.
  - Mapea cada tarjeta a su categoría, familia o aplicación real.
  - Si no hay equivalente, enlaza a la búsqueda con el término correspondiente.
  - "Ofertas %" apunta al catálogo filtrado por promoción activa.
- **Marcas.**
  - Solo marcas que existen en la base de datos, enlazadas al filtro de marca.
  - Se muestran como **wordmarks tipográficos** en tiles blancos con el mismo tamaño y ritmo que la referencia.
  - **No generes logos de marcas con IA** (salen deformados y son marcas registradas).
  - Si Jean deja SVG oficiales en `public/brands/<slug>.svg`, úsalos automáticamente.
- **Contacto.** Teléfono, email, WhatsApp y redes salen de la configuración real de la empresa (`company-settings`). Lo que no esté configurado no se muestra; no inventes datos.
- **Newsletter.** Debe persistir de verdad: tabla nueva, endpoint con validación, rate-limit e idempotencia por email.
  - **Genera la migración, no la apliques.**
  - Si no persiste, no se muestra.
- **Año del footer.** Dinámico.
- **Cotización (0) y Carrito (0).** Contadores reales, los mismos que existen hoy.
- **Mi cuenta / Ingresar.** Con sesión, muestra el nombre del usuario.
- **Imágenes generadas.** Sin logotipos de marcas reales. Por ejemplo, el compresor del hero no lleva "embraco" impreso; usa un equipo genérico.

## Fase A — Diseño y activos (entregar y DETENERSE)

1. **Especificación medida** (`docs/goal/designs/home-espejo/spec.md`).
   - Escala la referencia a 1920 de ancho (factor ≈ 1,951) y mide cada sección:
     - y inicial y alto en px;
     - ancho del contenedor y gutters;
     - número de columnas y gaps;
     - alto de las cards;
     - proporción imagen/texto;
     - tamaños de fuente y pesos;
     - radios y colores exactos (usa un cuentagotas sobre la imagen).
   - El contenedor debe coincidir con la referencia (márgenes ≈ 4,4% por lado → ≈ 1750 px útiles a 1920). Justifica si difiere del 1500–1650 del prompt; manda la imagen.
2. **Imágenes.** Genéralas tú con tu herramienta de imágenes, fotorealistas y con la misma composición y encuadre que la referencia. Guárdalas en WebP optimizado en `public/images/home-espejo/`:
   - fondo + composición del hero (desktop 1920 y versión móvil);
   - 8 categorías;
   - banner navy;
   - 6 tarjetas de "trabajo que necesitas resolver";
   - rail "OFERTAS del MES" y rail "Herramientas y equipos de instalación".
   - Las fotos de producto de las cards salen del producto real (`resolveProductImage`), no de imágenes nuevas.
3. **Mock de comparación.** Una captura estática del diseño a 1920 de ancho (puede ser HTML estático o una imagen compuesta con tus activos), para compararla lado a lado con la referencia: `docs/goal/designs/home-espejo/mock-1920.png`.
4. **Diseño móvil (390).** Propón la adaptación responsive fiel al mismo sistema:
   - header compacto con buscador;
   - categorías y productos en carrusel o grid de 2;
   - rail debajo;
   - footer apilado.
   - Entrega `docs/goal/designs/home-espejo/mock-390.png`.
5. Reporta la lista de activos, las medidas clave y cualquier ambigüedad. **No implementes todavía.**

## Fase B — Implementación (solo después de la aprobación de Claude)

Esta fase se ordenará en la misma sesión.

- Implementar el espejo con los componentes del home y el header/footer públicos. Header, barra de categorías, utility bar y footer son globales: aplican a todas las páginas públicas; verifica que no rompan catálogo, ficha, carrito, cuenta ni auth.
- Rendimiento:
  - servidor primero, con islas cliente mínimas (tabs, newsletter, favoritos);
  - `next/image` con `sizes` y `priority` solo en el hero;
  - LCP < 2 s y CLS < 0,05.
- Accesibilidad:
  - un solo `<h1>`, landmarks y skip link;
  - foco visible y contraste AA;
  - tabs con `role="tablist"`;
  - acordeón accesible.
- Fixture de desarrollo, si hacen falta datos para que la página local se vea como la referencia (12 productos publicados con precio, marcas y promociones):
  - script reutilizable, idempotente y protegido contra producción, con `--revert`, siguiendo el patrón de `src/lib/dev-mock-fixtures.ts`;
  - usa productos **reales** del catálogo que correspondan a los tipos de la referencia (compresor, motor ventilador, controlador, refrigerante, hélice, válvula, presostato, tarjeta, bomba de drenaje, condensador, relé, filtro secador);
  - precios de prueba solo como fixture de dev, visible con el banner de vista previa.
- Actualiza o crea los contratos de test del home espejo:
  - 8 categorías, 6 + 6 productos, orden de secciones, rail, sin precios inventados;
  - elimina las aserciones del home anterior.

## Verificación (Fase B)

- Sin commit.
- Tests con `--test-timeout=60000`.
- Migraciones: genera, no apliques.
- Corre `tsc`, `corepack pnpm lint` (0 errores), `node scripts/test-all.mjs` (solo se acepta el Excel externo) y `corepack pnpm build`.
- Comparación visual final:
  - captura full-page a 1920×1080 (zoom 100%) de tu servidor local, escalada a 984 de ancho;
  - colócala junto a `referencia.png` en `docs/goal/designs/home-espejo/comparacion.png`;
  - revisa sección por sección con el checklist 53–59 del prompt;
  - itera hasta que coincida dentro de la tolerancia (±5%).
- Captura a 390 y revisa consola.
- Reporta desviaciones justificadas (solo por honestidad de datos), archivos cambiados, migración y riesgos.
