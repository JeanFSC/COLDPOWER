# Spec visual — Tienda pública ColdPower

Estado: diseño aprobado para auditoría posterior; no implementar en este turno. La referencia visual principal es 1920 × 1080 al 100%; el uso prioritario es mobile-first en 390 × 844.

## 1. Decisiones globales

### Objetivo del comprador

Un técnico llega con un código o modelo y debe poder buscarlo, entender el estado real y pasar a cotizar/comprar en dos toques como máximo.

### Principios

- Buscar por código es la acción reina: el buscador vive en el hero y se repite en catálogo, ficha y 404.
- La imagen precede al texto; cada bloque comunica una sola idea visible y usa como máximo una frase.
- La tarjeta de producto tiene imagen grande, un dato clave, precio o estado `Cotizar` y una sola CTA primaria.
- Producto sin precio publicado es solamente cotizable; nunca se dibuja un precio de muestra.
- Familia no equivale a categoría; las relaciones deben provenir de datos explícitos y se rotulan como `Relacionados`, nunca como compatibilidad.
- Las bandas navy siempre llevan profundidad visual; se elimina el navy plano de FinalCTA, Footer, FAQ y asides.

### Cabecera única y contrato de navegación

Todos los mockups comparten la misma cabecera `StoreHeader`: logo ColdPower, búsqueda, `Cotización` con contador de la lista de cotización, `Mi cuenta` y `Carrito` con contador. El orden, labels, iconos, alturas y separación son invariantes entre home, catálogo, ficha y carrito.

- Desktop interior: buscador visible con placeholder `Busca por SKU, modelo o marca`.
- Home: conserva el mismo logo y acciones, pero la cabecera muestra solo el icono de búsqueda porque el buscador principal vive en el hero.
- Mobile: misma jerarquía y contador; las acciones se compactan sin eliminar `Cotización`, `Mi cuenta` o `Carrito`.
- Los contadores representan el estado real de cada lista; no son decoración ni texto inventado.
- No crear menús alternativos por pantalla ni omitir el carrito en catálogo o ficha.

### Fundaciones visuales

| Token | Valor / uso |
|---|---|
| Navy | `#0B2239` — encabezados oscuros, superficies profundas, texto sobre superficie clara. |
| Azul | `#0F6FAE` — links, eyebrows y estados interactivos. |
| Ámbar | `#F59E0B` — relleno de CTA; texto siempre navy, nunca blanco. |
| Superficie | `#F4F7F9` — fondo de página. |
| Borde | `#D7E0E7` — inputs, tarjetas y divisores. |
| Texto secundario | `#667085` — ayuda y estados no primarios. |
| Radios | 8 / 10 / 16 px según control, campo o tarjeta. |
| Tipografía | IBM Plex Sans para interfaz; IBM Plex Mono para eyebrows, SKU y datos técnicos. |

Eyebrows y enlaces usan `brand-secondary-600`. El contraste de CTA se resuelve con ámbar + texto navy; no se permite texto blanco sobre `#F59E0B` ni ámbar sobre blanco.

## 2. Home `/`

Referencia: [`home-desktop.png`](./home-desktop.png) y [`home-mobile.png`](./home-mobile.png).

| Orden | Bloque / propósito visible | Componentes a crear o reutilizar | Decisión de interacción |
|---:|---|---|---|
| 1 | Header: llegar a catálogo, categorías, ayuda, cuenta y carrito sin competir con el hero. | Reusar `Header`, navegación pública y acciones compactas. | Header sticky con `--header-h`; skip link antes de la navegación. |
| 2 | Hero: `Encuentra tu repuesto por código`. | Reusar `SearchBar`; crear `StoreHero` con imagen, malla y chips de ejemplo. | Submit por Enter/click; el botón dice exactamente `Buscar`; chips rellenan la consulta; foco visible de alto contraste. |
| 3 | Categorías: `Explora por categoría`. | Crear `CategoryMosaic` y reutilizar `CategoryCard`. | Tile completo clicable; imagen primero; contador solo si proviene de backend. |
| 4 | Productos: mostrar referencias reales disponibles o un estado honesto. | Reusar `ProductGrid`/`ProductCard`; crear `RelatedProductRail` si el contrato lo permite. | Una CTA por tarjeta; comparar queda como icono/acción secundaria separada. |
| 5 | Beneficios: cuatro chips cortos que condensan búsqueda, datos, compra y cotización. | Crear `TrustChips`; usar iconos del sistema existente. | Sin párrafos ni repetición del hero; cada chip funciona como lectura rápida. |
| 6 | Marcas: wordmarks solamente de marcas que existan en los datos publicados. | Reusar bloque de marcas o crear `BrandStrip`. | Si no hay datos, ocultar el bloque; nunca dibujar logos inventados. |
| 7 | Ayuda: `¿No lo encuentras? Envía foto de la placa`. | Reusar `FinalCTA` pero con `superficies.png`/textura real y `ImageUploadLead`. | Una CTA; el estado de archivo y el consentimiento deben ser honestos. |
| 8 | Footer: navegación, contacto y legales. | Reusar `Footer`; aplicar textura navy, no banda plana. | Links internos sin recarga completa; foco y contraste revisados. |

FAQ sale de la home y vive en `/faq`; no duplicar `TechnicalSearchGuide`, `BenefitsBar` y `ApplicationSolutions` con copy equivalente.

## 3. Ficha `/producto/[slug]`

Referencia: [`ficha-desktop-con-precio.png`](./ficha-desktop-con-precio.png), [`ficha-desktop-sin-precio.png`](./ficha-desktop-sin-precio.png) y [`ficha-mobile.png`](./ficha-mobile.png). `ficha-desktop.png` queda solo como alias de compatibilidad de la variante sin precio.

| Orden | Bloque / propósito visible | Componentes a crear o reutilizar | Regla de datos / interacción |
|---:|---|---|---|
| 1 | Breadcrumb: ubicar al comprador en categoría → familia → producto. | Reusar breadcrumb accesible. | Cada segmento navega a su módulo; no usar texto sin enlace para rutas válidas. |
| 2 | Galería: validar visualmente la pieza. | Reusar `ProductGallery`; crear chip persistente `Imagen referencial`. | Si no hay imagen real, mostrar estado honesto; thumbnails y zoom con teclado. |
| 3 | Identidad: nombre, SKU exacto y eyebrow de familia. | Reusar `SectionTitle`; crear `ProductIdentity`. | SKU inmutable desde backend; no completar campos desconocidos. |
| 4 | Variante con precio: estado comercial y compra. | Reusar `StatusBadge`/chips de tienda y `TransactionBox`. | Mostrar precio publicado y stock solo cuando existan en datos; el mockup usa el estado visible `Precio publicado` sin inventar un monto. CTA primaria ámbar `Agregar al carrito` con texto navy y secundaria `Cotizar`. |
| 5 | Variante solo cotizable: estado honesto sin compra inmediata. | Reusar `TransactionBox` y estado deshabilitado. | Mostrar `Solicitar cotización` como CTA primaria; el carrito queda deshabilitado con la etiqueta `Solo cotizable`; no mostrar precio numérico. |
| 6 | Especificaciones: lectura rápida en grid. | Crear `SpecChipGrid`. | Renderizar únicamente valores existentes; las specs sin dato se ocultan. No dibujar cuatro chips `Consultar`, `undefined`, `NaN` ni valores técnicos inventados. |
| 7 | Relacionados: continuar explorando. | Crear `RelatedProducts`; reutilizar tarjeta compacta. | Rotular `Relacionados`; no afirmar compatibilidad por compartir familia. |

En móvil la referencia aprobada es la variante solo cotizable: la CTA `Solicitar cotización` queda sticky dentro de una barra reservada; debe calcular el offset de WhatsApp y `CompareBar`, respetar safe-area y no tapar contenido. El título, estado y CTA deben seguir visibles sin una sección vacía de relleno.

## 4. Catálogo, categoría y búsqueda

Referencia: [`catalogo-desktop.png`](./catalogo-desktop.png) y [`catalogo-mobile.png`](./catalogo-mobile.png).

| Orden | Bloque / propósito visible | Componentes a crear o reutilizar | Regla de datos / interacción |
|---:|---|---|---|
| 1 | Cabecera de contexto: familia/categoría visible en una superficie navy profunda. | Crear `CatalogHero`; reusar `SearchBar`. | Imagen a baja opacidad + grid; ningún bloque navy plano; en desktop el hero mide como máximo 220 px para dejar la primera fila sobre el pliegue a 1920 × 1080. |
| 2 | Chips de familias: saltar sin perder el contexto. | Crear `FamilyChipRail`. | Las familias vienen de la jerarquía `categoría → familia`; rail horizontal en móvil. |
| 3 | Filtros: reducir la lista por marca, familia, refrigerante, voltaje y demás campos soportados. | Reusar `CatalogFilters` y drawer accesible. | Estado en URL; filtros y marca se resuelven en servidor, nunca con texto libre desconectado. |
| 4 | Orden: cambiar relevancia/criterio de forma funcional. | Reusar `SortSelect`. | `sort` viaja al servidor y el resultado visible confirma el cambio. |
| 5 | Grilla: comparar visualmente piezas sin leer párrafos. | Reusar `ProductGrid`/`ProductCard`. | Tres columnas desktop, dos columnas en 390 px. La tarjeta completa es clicable y contiene nombre real, SKU visible, un solo dato clave en chip, precio o `Cotizar` y una sola CTA `Agregar` o `Cotizar`; no usar tres botones ámbar `Ver ficha`. Chip `Imagen referencial` en cada imagen generada. |
| 6 | Paginación y estados: no descargar una lista infinita. | Reusar `Pager`, `SkeletonCard`, `CatalogUnavailable`, `error.tsx`. | Paginación server-side; loading conserva la forma real; error ofrece reintentar; vacío ofrece limpiar/buscar. |

Una coincidencia exacta de SKU debe llevar directamente a la ficha. El listado no inventa cantidades, precios, compatibilidades, marcas ni contadores de resultados.

## 5. Carrito y checkout `/carrito` → `/checkout`

Referencia: [`carrito-checkout-mobile.png`](./carrito-checkout-mobile.png).

| Orden | Bloque / propósito visible | Componentes a crear o reutilizar | Regla de datos / interacción |
|---:|---|---|---|
| 1 | Stepper: mostrar Carrito → Datos → Confirmar. | Crear `CheckoutStepper`. | El paso activo tiene estado accesible; no simular avance sin persistencia. |
| 2 | Ítems: revisar imagen, identidad y estado de cada producto. | Reusar `CartItem`; usar miniatura real o estado honesto. | Editar cantidad es idempotente; eliminar exige confirmación. |
| 3 | Resumen: consolidar total y condiciones en una superficie navy con textura. | Crear `OrderSummary`; reusar superficies de `superficies.png`. | Sin precio publicado: `Total por confirmar`; no inventar envío, descuento o impuestos. |
| 4 | CTA: continuar sin ambigüedad. | Reusar `Button`; crear barra sticky móvil. | Una CTA `Continuar`; no solapar WhatsApp/CompareBar ni esconder errores. |
| 5 | Estados de checkout: error, expiración, rechazo y confirmación. | Reusar `CheckoutForm`, `StatusBanner`, `error.tsx`. | Feedback explícito; no afirmar pago/pedido hasta persistencia transaccional. |

El carrito persistente y la cotización son acciones separadas. El visual no debe convertir un estado cotizable en una compra ni presentar el total como definitivo antes de validarlo.

## 6. FAQ, Nosotros y Contacto

| Página | Orden visual | Componentes / dirección |
|---|---|---|
| `/faq` | Hero de ayuda con `faq/hero-ayuda.webp` → acordeón breve → CTA de contacto. | Reusar `SectionTitle`, acordeón con `button`, teclado/Escape y superficie navy con foto a baja opacidad. Una respuesta visible por fila. |
| `/nosotros` | Foto de almacén → tres pasos técnicos como línea de tiempo → cobertura/asesoría. | Reusar el lenguaje de `/contacto`: tarjetas claras, bordes finos y fotos `about/*`; menos de 30% del texto actual. |
| `/contacto` | Hero partido texto/foto → canales → formulario → cobertura → CTA. | Preservar composición de `ContactPage`; corregir contraste ámbar y mantener `contact-*.webp` como referencia visual. |

No repetir `Tu proyecto, nuestro respaldo` en múltiples bloques; usar una sola formulación concreta y técnica.

## 7. Cuenta, auth y 404

| Página | Spec |
|---|---|
| `/cuenta/*`, `/sign-in`, `/sign-up` | Panel de imagen `auth/panel-tecnico.webp` + formulario claro; en móvil imagen arriba y campos debajo. Estados de carga, error, sesión y retorno preservan el contexto; no mostrar datos de otra cuenta. |
| `404` y búsqueda sin resultados | Hero breve `No encontramos esa pieza` → buscador protagonista → mosaico de categorías. CTA de retorno al catálogo; no dejar una pantalla vacía ni una lista de productos inventada. |
| `/comparar` | Tabla/stack de atributos solo con productos seleccionados; en móvil cada producto es una card horizontal y la barra inferior respeta la CTA sticky de ficha/carrito. |
| `/cotizacion` | Resumen de ítems → datos mínimos → envío transaccional; estados `borrador`, `enviada`, `error` y confirmación honesta. |
| `/pago/prueba/[ref]` | Mostrar el estado del pago mock y su siguiente acción; nunca afirmar cobro real ni inventar referencia. |

## 8. Movimiento y microinteracciones

- Entrada: `IntersectionObserver` agrega una clase de reveal con opacity/translate; CSS controla duración y easing. Stagger corto, solo para lectura progresiva.
- Hover: tarjeta eleva 1–2 px, la imagen gana contraste y el borde pasa a azul; no desplazar el layout ni ocultar información esencial.
- Búsqueda: focus ring azul visible, submit por teclado y chips con estado seleccionado.
- Loading: skeleton con la misma geometría de imagen, título, estado y CTA; shimmer sutil, sin bloquear el contenido.
- `prefers-reduced-motion: reduce`: eliminar reveal, shimmer y transformaciones; mantener estados instantáneos y foco visible.
- No usar una librería pesada de animación para resolver estos estados.

## 9. Estados y accesibilidad

- Loading: skeleton con forma real en home, catálogo, ficha, carrito y checkout.
- Error: `error.tsx`/estado de segmento con mensaje concreto, `Reintentar` y enlace de salida; no ocultar el error en una tarjeta vacía.
- Vacío: explicar qué falta y ofrecer buscar, limpiar filtros o volver al catálogo; nunca inventar productos o series.
- 404: buscador + categorías + CTA de retorno.
- A11y: un solo `h1`, jerarquía correcta, skip link, focus visible, targets mínimos de 44 px, drawer con `role=dialog`, Escape y foco atrapado, accordions con `aria-expanded`.
- Contraste: validar CTA ámbar/navy, azul de enlaces y texto secundario contra cada superficie; no usar ámbar como texto sobre blanco.
- Semántica: `<main>` único, labels explícitos, `alt` vacío para imágenes decorativas y alt descriptivo no redundante para producto/foto.

## 10. Responsive y performance

- Desktop de control: 1920 × 1080, zoom 100%, grillas de 12 columnas y cards con aire; el hero del catálogo no supera 220 px.
- Móvil de control: 390 × 844; catálogo en dos columnas, cards compactas y rail de chips horizontal.
- Sticky: reservar `--header-h`, altura de CTA y safe-area; el offset compuesto debe considerar WhatsApp y `CompareBar`.
- Imágenes: WebP/AVIF, `sizes` explícito, `priority` solo above-the-fold; hero público < 250 KB.
- Mantener texto total bajo; ningún bloque requiere leer más de una frase para entender su acción.

## 11. Criterio de handoff para Claude

La implementación posterior debe reproducir estas referencias y reglas, no reinterpretarlas: cabecera única, buscador protagonista, `Buscar` en home, variantes de ficha con precio/solo cotizable, una CTA por tarjeta, cards completas clicables, chips honestos, imagen referencial, jerarquía categoría → familia → producto, bandas oscuras con profundidad, hero de catálogo compacto, dos columnas móviles y estados completos. La auditoría de implementación debe probar el flujo SKU → ficha → cotizar/comprar, los estados loading/error/vacío/404, teclado, contraste, ausencia de solapes y consola en 1920 × 1080 y 390 px.
