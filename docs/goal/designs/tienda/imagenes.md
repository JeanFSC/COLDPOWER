# Guía de imágenes — Tienda pública ColdPower

Estado: diseño visual generado el 2026-09-23. Este directorio es un handoff de diseño; no modifica la aplicación ni representa un import operativo del catálogo.

## Dirección visual

- Fotografía técnica de estudio, realista y limpia: compresores, evaporadores, ventiladores, capacitores, tarjetas y herramientas con proporciones plausibles.
- Fondos claros para producto/categoría y fondos navy con profundidad para superficies: malla, grid técnico, foto HVAC a baja opacidad y ruido fino.
- Paleta de referencia: navy `#0B2239`, azul `#0F6FAE`, ámbar `#F59E0B`, superficie `#F4F7F9`, borde `#D7E0E7`.
- Sin logos de marcas externas, etiquetas legibles inventadas, marcas de producto, marcas de agua ni claims técnicos dentro de la imagen.
- Toda imagen de producto, categoría o familia generada se presenta con el chip visible `Imagen referencial`; nunca prueba compatibilidad, existencia, stock o precio de un SKU.
- El copy editable vive en la interfaz, no dentro de la fotografía, salvo el wordmark aprobado de ColdPower cuando corresponda al shell.

## Samples generados y validados

Los tres samples se generaron con la skill `imagegen`, se inspeccionaron y se exportaron en WebP con dimensiones exactas para el set inicial.

| Archivo | Dimensiones | Peso | Uso | Tratamiento obligatorio |
|---|---:|---:|---|---|
| `muestra-hero.webp` | 1600 × 1000 | 44 KB | Hero técnico de referencia | No usar como foto exacta de un SKU; reservar espacio para copy y buscador. |
| `muestra-categoria-refrigeracion.webp` | 800 × 800 | 71 KB | Tile de categoría Refrigeración | Mostrar `Imagen referencial` cuando represente una categoría o familia. |
| `muestra-familia-compresores.webp` | 800 × 800 | 20 KB | Tile de familia Compresores | No inferir marca, compatibilidad, stock ni precio por la apariencia. |

## Mockups de alta fidelidad

Regla transversal: todos los mockups reutilizan una cabecera única con logo, búsqueda, `Cotización` + contador, `Mi cuenta` y `Carrito` + contador. En home la búsqueda de la cabecera se reduce a icono porque el campo principal vive en el hero.

| Archivo | Viewport | Intención |
|---|---:|---|
| `home-desktop.png` | 1920 × 1080 | Hero con buscador protagonista y mosaico visual de categorías. |
| `home-mobile.png` | 390 × 844 | Búsqueda rápida en móvil, hero apilado y mosaico de dos columnas. |
| `ficha-desktop-con-precio.png` | 1920 × 1080 | Variante con estado visible `Precio publicado`/`Stock disponible` sin inventar monto, `Agregar al carrito` ámbar y secundaria `Cotizar`. |
| `ficha-desktop-sin-precio.png` | 1920 × 1080 | Variante solo cotizable: `Solicitar cotización`, carrito deshabilitado `Solo cotizable` y solo specs con dato. |
| `ficha-desktop.png` | 1920 × 1080 | Alias de compatibilidad de la variante sin precio; las dos variantes anteriores son la referencia autoritativa. |
| `ficha-mobile.png` | 390 × 844 | Variante solo cotizable mobile-first, con CTA sticky y sin solape de superficies flotantes. |
| `catalogo-desktop.png` | 1920 × 1080 | Hero compacto de máximo 220 px, filtros y grilla de tres columnas con primera fila sobre el pliegue. |
| `catalogo-mobile.png` | 390 × 844 | Filtros/orden y grilla de dos columnas; tres cards completas, sin skeleton ni cuarta tarjeta. |
| `carrito-checkout-mobile.png` | 390 × 844 | Progreso Carrito → Datos → Confirmar, total por confirmar y CTA sticky. |
| `superficies.png` | 1920 × 1080 | Muestra de Malla navy, Grid técnico, Foto a baja opacidad y Ruido fino. |

Las cards del catálogo muestran ejemplos reales de referencia visual (`CP-REF-MCP-0995`, `CP-REF-VEN-0844`, `CP-REF-CAP-0412`), nombre real, SKU, un dato clave y una sola CTA `Cotizar`. La card completa es clicable; no usar botones repetidos `Ver ficha`. Los datos operativos deben seguir viniendo del catálogo/DB durante implementación.

## Set completo de producción definido por la auditoría

Las rutas siguientes son el inventario de diseño que debe completarse en la fase de implementación. La lista no autoriza inventar contenido: cada imagen debe corresponder a datos o a una fixture de desarrollo protegida, y conservar el chip de referencia cuando sea generada.

### Hero y superficies

- `home/hero-tecnico-hvac.webp`
- `home/hero-tecnico-hvac-mobile.webp`
- `home/placa-equipo-ayuda.webp`
- `surfaces/navy-mesh.webp`
- `surfaces/grid-tecnico.svg` — textura/vector de sistema, no fotografía.
- `surfaces/noise.png`

### Categorías (`categories/<slug>.webp`)

- `categories/refrigeracion.webp`
- `categories/aire-acondicionado.webp`
- `categories/lavadora.webp`
- `categories/secadora.webp`
- `categories/cocina.webp`
- `categories/campana-extractora.webp`
- `categories/extractor.webp`
- `categories/terma.webp`
- `categories/bomba-de-agua.webp`
- `categories/motores-automotrices.webp`
- `categories/licuadora.webp`
- `categories/hervidor.webp`
- `categories/arrocera.webp`
- `categories/plancha.webp`
- `categories/lustradoras.webp`
- `categories/otros-electrodomesticos.webp`
- `categories/repuestos-y-accesorios-generales.webp`

### Familias (`families/<slug>.webp`)

- `families/compresores.webp`
- `families/capacitores.webp`
- `families/tarjetas-electronicas.webp`
- `families/motores-ventiladores.webp`
- `families/termostatos-controles.webp`
- `families/valvulas-filtros.webp`
- `families/refrigerantes.webp`
- `families/herramientas.webp`
- `families/resistencias.webp`
- `families/timers-sensores.webp`

### Placeholders de producto (`products/placeholder-<familia>.webp`)

- `products/placeholder-compresores.webp`
- `products/placeholder-capacitores.webp`
- `products/placeholder-tarjetas-electronicas.webp`
- `products/placeholder-motores-ventiladores.webp`
- `products/placeholder-termostatos-controles.webp`
- `products/placeholder-valvulas-filtros.webp`
- `products/placeholder-refrigerantes.webp`
- `products/placeholder-herramientas.webp`
- `products/placeholder-resistencias.webp`
- `products/placeholder-timers-sensores.webp`

### Páginas informativas y estados

- `about/almacen.webp`
- `about/asesor-mostrador.webp`
- `about/despacho.webp`
- `faq/hero-ayuda.webp`
- `auth/panel-tecnico.webp`
- `404/repuesto-perdido.webp`
- `og/og-default.jpg` — 1200 × 630.

### Marca

- `brand/logo-coldpower.svg` — vectorizar el logo existente; no rediseñar.
- `brand/logo-coldpower-light.svg` — variante clara del logo existente; no rediseñar.

## Reglas de exportación para implementación

- Fotografías de contenido: WebP/AVIF; hero público por debajo de 250 KB y `sizes` explícito.
- El set objetivo de la auditoría es 1600 × 1000 para fotografías anchas, máximo 180 KB; tiles 800 × 800, máximo 80 KB.
- `priority` solamente en la imagen above-the-fold; el resto debe cargar de forma diferida.
- No convertir una imagen referencial en evidencia de stock, precio, marca o compatibilidad.
- Si falta la imagen real, usar un estado honesto o una fixture de desarrollo protegida; no inventar el producto ni su identidad.
