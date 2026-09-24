# Home espejo ColdPower — especificación medida de Fase A

Fecha: 2026-09-24  
Fuente visual de verdad: `referencia.png` (984 × 1599 px)  
Escala de diseño desktop: `1920 / 984 = 1,951219512`  
Altura equivalente: `1599 × 1,951219512 = 3120 px`

Esta especificación describe el target visual y los mocks de Fase A. No es una implementación ni autoriza todavía cambios en componentes, rutas, consultas o contratos.

## 1. Sistema de coordenadas y contenedor

- El contenido útil medido en la referencia va aproximadamente de `x=43` a `x=941`.
- Ancho útil de referencia: `899 px`; a 1920: aproximadamente `1752 px`.
- Gutters desktop objetivo: `84 px` por lado (`4,375%` del viewport).
- Ejes desktop: `x=84` izquierdo y `x=1836` derecho.
- La imagen manda frente al rango orientativo `1500–1650 px` del prompt: el espejo debe conservar el contenedor ancho, sin convertirlo en un layout de 1200 px.
- Fondo general: blanco casi plano con separaciones muy sutiles; el navy queda reservado para hero, banner y footer.
- Secciones: padding vertical visual entre `24–40 px` a escala final; ningún salto entre bloques supera aproximadamente `48–56 px`.

## 2. Bandas verticales medidas

Los cortes se tomaron sobre los cambios de superficie y los bordes visuales principales de la captura. Las coordenadas finales son la referencia para el mock desktop de 1920.

| Sección | Referencia `y` | Alto ref. | Desktop 1920 `y` | Alto final | Composición |
|---|---:|---:|---:|---:|---|
| Utility bar | `0–20` | 20 | `0–39` | 39 | Franja naranja, mensajes centrados y ayuda a la derecha |
| Header principal | `20–72` | 52 | `39–140` | 101 | Logo, buscador dominante y tres accesos comerciales |
| Navegación | `72–101` | 29 | `140–197` | 57 | Todas las categorías, familias y Ofertas |
| Hero | `101–333` | 232 | `197–650` | 453 | Copy izquierda, equipos HVAC derecha, panel de aplicaciones |
| Líneas de producto | `333–500` | 167 | `650–976` | 326 | Título, enlace y 8 cards en una fila |
| Referencias para empezar | `500–744` | 244 | `976–1452` | 476 | Tabs y 6 cards de producto |
| Avanza con el dato | `744–845` | 101 | `1452–1649` | 197 | Seis accesos compactos |
| Banner navy | `845–953` | 108 | `1649–1860` | 211 | Copy izquierda, foto integrada y panel derecho |
| Trabajo que necesitas resolver | `953–1096` | 143 | `1860–2139` | 279 | Seis cards de solución |
| Fabricantes | `1096–1166` | 70 | `2139–2276` | 137 | Título y 10 tiles wordmark |
| Nuevos ingresos + rails | `1166–1355` | 189 | `2276–2644` | 368 | 6 productos a la izquierda, 2 rails apilados a la derecha |
| Ayuda antes del footer | `1355–1477` | 122 | `2644–2882` | 238 | FAQ izquierda y asesoría a la derecha |
| Footer | `1477–1599` | 122 | `2882–3120` | 238 | Navy profundo, 5 áreas, newsletter y legal |

## 3. Grids, columnas y cards

### Categorías

- Ocho columnas.
- Inicios medidos en referencia: `43, 157, 271, 385, 496, 609, 721, 835 px`.
- En desktop: cards de aproximadamente `207–210 px` de ancho, gaps de `12–16 px`, alto visual `226–240 px`.
- El bloque de imagen ocupa aproximadamente `65%` del alto de la card; texto y flecha el `35%` inferior.
- Radio final: `12–14 px`; borde `1 px` equivalente, sin sombra pesada.

Orden obligatorio: Compresores, Refrigeración, Aire acondicionado, Motores y ventiladores, Controles, Herramientas, Repuestos, Línea blanca.

### Referencias para empezar

- Seis columnas iguales.
- Inicios medidos: `43, 194, 345, 496, 648, 799 px`.
- Desktop: cards de aproximadamente `279–282 px` de ancho, gaps de `15–17 px`, alto `380–395 px`.
- Imagen: `45–50%` de la card; el resto se reparte entre nombre, código, marca, precio y CTA.
- Badge y corazón viven dentro del borde superior; CTA naranja ocupa todo el ancho útil inferior.
- Radio final: `14–16 px`; borde `#E1E8F0`; sombra mínima.

Tipos visuales del target: compresor hermético, motor ventilador, controlador, refrigerante, hélice y válvula. En Fase B las imágenes, precios, badges, disponibilidad y capacidad de compra deben salir de la base de datos y de `resolveProductImage`; el mock usa arte de familia únicamente para verificar proporción y densidad.

### Avanza con el dato

- Seis columnas en la misma retícula de producto.
- Alto final aproximado: `88–100 px`.
- Icono azul circular a la izquierda, título de una línea, microejemplo y flecha a la derecha.
- No convertirlo en cards grandes ni en una lista vertical en desktop.

### Trabajo que necesitas resolver

- Seis columnas, mismas guías laterales que el grid de producto.
- Card final aproximada: `279–282 × 160–180 px`.
- Imagen dominante: `65–70%` del alto; título, microtexto y flecha abajo.
- Orden: Refrigeración comercial, Cámaras frigoríficas, Aire acondicionado, Línea blanca, Industria alimentaria, Mantenimiento y servicio.

### Fabricantes

- Diez tiles en una sola fila.
- Mismo ancho útil de `1752 px`, gap aproximado `4 px`, altura final `70–80 px`.
- Superficie blanca, borde fino, wordmarks tipográficos azules/navy.
- No se generaron logos con IA. La implementación deberá tomar marcas reales de la base de datos y usar SVG oficial en `public/brands/<slug>.svg` solo si existe.

### Nuevos ingresos y rails

- Izquierda: seis cards compactas; bloque aproximado `x=84–1400`.
- Derecha: rail aproximado `x=1434–1836`, ancho `≈402 px`, con dos banners verticales apilados y gap `≈14–18 px`.
- Cada rail ocupa aproximadamente `175–180 px` de alto en desktop.
- El rail no se convierte en carrusel ni se mueve debajo del grid en desktop.
- Badges `Nuevo`, precios y CTAs son datos/estado real en Fase B; el mock solo muestra la jerarquía visual.

## 4. Tipografía y jerarquía

La captura usa una sans moderna, pesada y comercial, con métricas similares a Inter/Manrope/Geist. No hay serif, monospace ni tipografía industrial agresiva.

| Elemento | Tamaño aproximado en ref. | Equivalente a 1920 | Peso |
|---|---:|---:|---:|
| Utility bar | 7–8 px | 14–16 px | 500 |
| Navegación y metadatos | 7–9 px | 14–18 px | 500–650 |
| H1 del hero | 28–30 px | 55–59 px | 800–850 |
| Título de sección | 15–16 px | 29–31 px | 750–800 |
| Subtítulo de sección | 7–9 px | 14–18 px | 400–500 |
| Nombre de producto | 8–10 px | 16–20 px | 650–750 |
| Precio | 10–11 px | 20–22 px | 750–800 |
| CTA | 8–9 px | 16–18 px | 700 |
| Footer/link | 7–9 px | 14–18 px | 400–600 |

El H1 conserva tres líneas: `Todo para refrigeración` / `y aire acondicionado` / `en un solo lugar`. La tercera línea es naranja; el resto, blanco.

## 5. Color medido y tokens de implementación

Los valores de cuentagotas siguientes son lecturas de píxel de la captura rasterizada; pueden variar un poco por compresión y antialiasing. Los tokens canónicos del prompt se conservan para la implementación.

| Uso | Muestra medida | Hex aproximado | Token objetivo |
|---|---|---|---|
| Utility naranja | `(254,134,45)` | `#FE862D` | `#FF8A00` |
| CTA naranja | `(254,136,40)` | `#FE8828` | `#FF8A00` |
| Amber del hero | naranja cálido | `#FF9F0A` | `#FF9F0A` |
| Botón navy | `(0,30,71)` | `#001E47` | `#082A47` |
| Azul tab activo | `(8,96,248)` | `#0860F8` | `#1677FF` |
| Banner navy medio | `(8,51,98)` | `#083362` | `#082A47` |
| Footer | `(0,29,61)` | `#001D3D` | `#082A47` |
| Borde card | `(212,220,230)` | `#D4DCE6` | `#E1E8F0` |
| Superficie clara | `(254,254,254)` | `#FEFEFE` | `#FFFFFF` |
| Fondo gris azulado | — | — | `#F5F8FB` |
| Precio/oferta | rojo visual | `#E12A20` | rojo semántico |
| WhatsApp/positivo | verde visual | `#13A968` | verde semántico |

Radios objetivo: productos `14–16 px`, categorías `12–14 px`, banners `14–18 px`, botones `10–12 px`, pills de tabs `20–24 px`. Las sombras deben ser casi imperceptibles; el peso viene de imagen, borde y contraste.

## 6. Propuesta móvil de 390 px

No existe una captura móvil adjunta para este ticket; la adaptación siguiente mantiene el sistema visual y queda representada en `mock-390.png`.

- Viewport: `390 px`; gutter fijo `16 px`; ancho útil `358 px`.
- Utility bar: `28 px`, mensaje compacto.
- Header: `104 px`; logo y menú en primera línea, buscador de ancho completo debajo.
- Hero: `338 px`; copy sobre la zona navy superior y equipos en la mitad inferior, usando `hero-mobile.webp`.
- Categorías: grid de 2 columnas, cards de `172 × 100 px`, cuatro filas; no reducir las 8 categorías.
- Referencias y nuevos ingresos: grid de 2 columnas, cards de aproximadamente `172 × 255 px`; tabs horizontales compactas.
- Avanza con el dato: grid de 2 columnas, tres filas de accesos reducidos.
- Banner navy: full width, aproximadamente `255 px`, texto arriba y equipo visible debajo.
- Trabajo que necesitas resolver: grid de 2 columnas, seis cards, sin eliminar soluciones.
- Fabricantes: rail horizontal de tiles; no intentar encajar las 10 marcas en una sola fila visible.
- Rails de ofertas e instalación: debajo del grid de nuevos ingresos, apilados, nunca ocultos.
- FAQ y asesoría: una columna, acordeones y CTA de WhatsApp visibles.
- Footer: columnas apiladas, newsletter después de los enlaces principales y legal al final.

## 7. Activos generados en Fase A

Todos los activos se generaron con la herramienta de imágenes usando la referencia local como guía de composición. Se excluyeron texto, marcas, logos reales, personas y marcas de SKU. Se optimizaron a WebP; peso total: aproximadamente `1,44 MB`.

| Archivo | Dimensión | Uso |
|---|---:|---|
| `hero-desktop.webp` | 1920 × 761 | Fondo fotográfico del hero desktop; se recorta al slot `1920 × 453` con `object-fit: cover`. |
| `hero-mobile.webp` | 780 × 975 | Reencuadre vertical del hero para 390 px. |
| `category-compresores.webp` | 768 × 576 | Card Compresores |
| `category-refrigeracion.webp` | 768 × 576 | Card Refrigeración |
| `category-aire-acondicionado.webp` | 768 × 576 | Card Aire acondicionado |
| `category-motores-ventiladores.webp` | 768 × 576 | Card Motores y ventiladores |
| `category-controles.webp` | 768 × 576 | Card Controles |
| `category-herramientas.webp` | 768 × 576 | Card Herramientas |
| `category-repuestos.webp` | 768 × 576 | Card Repuestos |
| `category-linea-blanca.webp` | 768 × 576 | Card Línea blanca |
| `banner-navy.webp` | 1920 × 420 | Foto integrada del banner navy; se recorta al slot de `211 px`. |
| `job-refrigeracion-comercial.webp` | 959 × 540 | Solución Refrigeración comercial |
| `job-camaras-frigorificas.webp` | 959 × 540 | Solución Cámaras frigoríficas |
| `job-aire-acondicionado.webp` | 959 × 540 | Solución Aire acondicionado |
| `job-linea-blanca.webp` | 959 × 540 | Solución Línea blanca |
| `job-industria-alimentaria.webp` | 959 × 540 | Solución Industria alimentaria |
| `job-mantenimiento-servicio.webp` | 959 × 540 | Solución Mantenimiento y servicio |
| `rail-ofertas-mes.webp` | 640 × 800 | Fondo del rail Ofertas del mes |
| `rail-herramientas-instalacion.webp` | 640 × 800 | Fondo del rail Herramientas y equipos de instalación |

Las fotos de producto no forman parte de esta lista: en Fase B deben resolverse con el producto real (`resolveProductImage`) y nunca deben reemplazarse por estos assets generados.

## 8. Mocks entregados

- `mock-1920.png`: `1920 × 3120`, página completa para comparar contra la referencia escalada a 1920.
- `mock-390.png`: `390 × 4990`, propuesta responsive de página completa.
- Los mocks usan los 19 activos generados en sus slots correspondientes.
- Para que la proporción de las cards de producto pueda evaluarse antes de tener la consulta real, el mock usa imágenes de familia existentes como arte estructural. No representan un SKU, precio, marca, stock ni promoción aprobados; deben ser sustituidas en Fase B por datos e imágenes reales.
- El logo de ColdPower del mock es el asset oficial existente; no fue generado con IA.

## 9. Ambigüedades y decisiones

1. El prompt menciona un contenedor de `1500–1650 px`, pero la referencia medida tiene aproximadamente `1752 px` útiles a 1920. Se eligió la referencia visual, como ordena el brief.
2. La referencia móvil no fue adjuntada. Se eligió grid de 2 para categorías/productos y rail apilado porque conserva la densidad sin crear un carrusel obligatorio para la tarea principal.
3. El manuscrito `Tu proyecto, nuestro respaldo`, iconos, tabs, wordmarks y textos del UI se mantienen como capas de interfaz; no se generaron como parte de las fotos.
4. La captura muestra ejemplos de precios y badges, pero la honestidad de datos obliga a que Fase B los consulte en servidor. El mock no autoriza esos valores.
5. La comparación final de implementación deberá hacerse en navegador a 1920×1080 y 390 px, con autenticación real, consola limpia y estados de datos reales. Esta Fase A no declara la UI implementada ni validada en runtime.

## 10. Gate para iniciar Fase B

- Aprobación explícita de Claude/Jean sobre `spec.md`, `mock-1920.png`, `mock-390.png` y la dirección de los activos.
- Confirmar consultas reales para precios, promociones, nuevos ingresos, más vendidos, marcas, contacto, favoritos y newsletter.
- Confirmar que ningún valor del mock se copie como dato operativo.
- Implementar después con el flujo `diseñar → validar → implementar`, preservando los cambios ajenos existentes en el árbol.
