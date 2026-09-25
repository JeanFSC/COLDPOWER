# Design QA · M10 lote 3

final result: passed

## Source visual truth

- `docs/goal/designs/home-espejo/referencia.png` — 984 × 1599 px. La fuente es la tienda completa; se comparó especialmente su TopBar, logo, buscador, navegación técnica, CTA naranja, navy y tratamiento de footer.
- La composición específica de Mi cuenta se validó contra `prompt.md`, porque la fuente adjunta es la portada de la tienda y no una captura de la cuenta.

## Implementation evidence

| Estado | Screenshot | CSS viewport | Pixel output | DPR |
| --- | --- | ---: | ---: | ---: |
| Hub desktop | `cuenta-hub-desktop-1920x1080.png` | 1920 × 1080 | 1920 × 1080 | 1 |
| Hub mobile | `cuenta-hub-mobile-390x844.png` | 390 × 844 | 390 × 844 | 1 |
| Pedidos desktop | `cuenta-pedidos-desktop-1920x1080.png` | 1920 × 1080 | 1920 × 1080 | 1 |
| Estado vacío desktop | `cuenta-vacia-desktop-1920x1080.png` | 1920 × 1080 | 1920 × 1080 | 1 |

Captura: `lamina/capture.mjs`, Chromium headless, `fullPage: false`, `document.fonts.ready` antes de cada captura. El capturador verificó `scrollWidth` igual al viewport en los cuatro estados.

## Comparación

- Evidencia conjunta de fuente y hub: `lamina/design-qa-source-vs-hub.png`.
- El shell conserva el orden y la jerarquía de la tienda: barra de servicio naranja, logo real de ColdPower, búsqueda central, cotización, cuenta, carrito, navegación técnica y CTA Ofertas.
- La cuenta no hereda el hero de marketing de la portada: el contenido operativo empieza inmediatamente después de migas y navegación persistente.
- Desktop: sidebar aproximada de 250 px y contenido con saludo, completar datos, atención, pedido en curso, recientes y volver a comprar visibles dentro de 1920 × 1080.
- Mobile: la navegación pasa a scroll horizontal; el bloque de atención aparece antes del pedido y los CTA quedan al alcance del pulgar. `scrollWidth = 390`.
- Estado vacío: no muestra badges de actividad ni cajas genéricas de “No registrada”; presenta tres pasos, ayuda por WhatsApp y una nota de propiedad de datos.

## Superficies revisadas

- Tipografía: IBM Plex Sans y IBM Plex Mono locales, cargadas antes de capturar; jerarquía diferenciada para títulos, cuerpo, estados y códigos.
- Espaciado/layout: contenedores, sidebar, grid de atención, timeline, filas recientes, navegación horizontal mobile y ausencia de overflow horizontal.
- Color/tokens: navy de tienda y cuenta, azul técnico, CTA naranja/café, amarillo de facturación y verde de estados.
- Imágenes/assets: logo real desde `public/brand`; no se usaron placeholders de producto, dibujos CSS ni SVG artesanal para sustituir assets.
- Copy: español del Perú, tildes, montos `S/`, fechas `set` y acciones del dominio.
- Accesibilidad: `main`, `nav`, breadcrumbs, `aria-label`, `aria-current`, `aria-pressed`, foco visible y controles de filtro como botones reales.

## Interacciones y consola

- `qa.mjs` cargó la lámina en Chromium sin servidor de app.
- En `pedidos`, el filtro “Pago pendiente” dejó exactamente una fila visible y `aria-pressed="true"`.
- En mobile se verificó viewport 390 × 844 y `scrollWidth = 390`.
- Errores de consola y `pageerror`: 0.

## Hallazgos

No quedan hallazgos accionables P0/P1/P2. La lámina usa datos de muestra para visualizar estados comerciales; `spec.md` separa esos ejemplos de las fuentes persistentes que deberá consumir la implementación real. El footer queda en el flujo HTML debajo del viewport cuando la densidad operativa del hub lo requiere, manteniendo el footer real de la tienda sin sacrificar las tareas prioritarias sobre el pliegue.

## Checklist final

- [x] Entregables con dimensiones exactas.
- [x] Header y footer de la tienda representados con assets/tokens reales.
- [x] Hub desktop y mobile.
- [x] Lista de pedidos con filtros y “Repetir pedido”.
- [x] Estado vacío sin actividad.
- [x] HTML, estilos, captura y dependencias aislados en `lamina/`.
- [x] Sin servidor de la aplicación, cambios en `src/`, base, `.env.local`, `proxy.ts` o commit.
