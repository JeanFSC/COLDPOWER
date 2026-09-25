# Design QA · M10 lote 2

## Fuente y alcance

- Fuente visual de shell: `docs/goal/designs/promociones/promociones-desktop-1920x1080.png`.
- Fuente funcional y responsive: `docs/goal/designs/m10-lote2/prompt.md`, `docs/goal/META-10.md` §3 y `docs/goal/designs/m10-lote2/spec.md`.
- Comparación combinada desktop: `docs/goal/designs/m10-lote2/lamina/qa-desktop-comparison.png`.
- Implementación renderizada: `docs/goal/designs/m10-lote2/lamina/m10-lote2.html`.
- Alcance: lámina HTML estática; no se inicia ColdPower, no se consultan datos operativos y no se prueban mutaciones de producción.

## Normalización y evidencia

| Vista | CSS viewport | PNG | DPR | Overflow horizontal | Consola / page errors / requests fallidos |
| --- | ---: | ---: | ---: | ---: | --- |
| Taxonomía desktop | 1920 × 1080 | 1920 × 1080 | 1 | 1920 | 0 / 0 / 0 |
| Taxonomía mobile | 390 × 844 | 390 × 844 | 1 | 390 | 0 / 0 / 0 |
| Producto desktop | 1920 × 1080 | 1920 × 1080 | 1 | 1920 | 0 / 0 / 0 |
| Producto mobile | 390 × 844 | 390 × 844 | 1 | 390 | 0 / 0 / 0 |
| Proveedor desktop | 1920 × 1080 | 1920 × 1080 | 1 | 1920 | 0 / 0 / 0 |
| Proveedor mobile | 390 × 844 | 390 × 844 | 1 | 390 | 0 / 0 / 0 |
| Configuración desktop | 1920 × 1080 | 1920 × 1080 | 1 | 1920 | 0 / 0 / 0 |
| Configuración mobile | 390 × 844 | 390 × 844 | 1 | 390 | 0 / 0 / 0 |

El renderizador lee los bytes 16–23 del header PNG y falla si la dimensión no coincide. Las capturas se hicieron con Chromium headless, `deviceScaleFactor: 1`, locale `es-PE`, zona horaria `America/Lima`, `document.fonts.ready` y `fullPage: false`. No hubo normalización de densidad: fuente desktop e implementación desktop se comparan a `1920 × 1080` 1:1; la referencia mobile no fue suministrada, así que el mobile se validó contra la especificación responsive del prompt.

## Comparación visual

### Full view

- El shell conserva sidebar de `198 px`, topbar de `76 px`, búsqueda global, fondo `#f8fafc`, navegación activa navy, logo real y soporte sin solapar el menú.
- Las cuatro vistas desktop usan la misma proporción, gutter y familia tipográfica de la fuente aprobada; el contenido cambia según la tarea del rol y no introduce un segundo shell.
- Las cuatro vistas mobile ocultan la sidebar, conservan el lockup, notificadores y avatar, mantienen el ancho de página en `390 px` y terminan sin controles persistentes cortados.

### Regiones focales revisadas

- **Taxonomía:** árbol con jerarquía y búsqueda; nodo seleccionado con conteos; alertas de duplicidad/impacto; lista de marcas con cobertura y atención.
- **Producto:** miniatura real, SKU/modelo mono, tabs, grilla de ficha/técnicos, inventario por local, readiness 4/5, vista en tienda y promoción.
- **Proveedor:** encabezado con RUC/acciones; cinco KPIs contextualizados; órdenes con retraso visible; recepciones en timeline; contacto y acciones.
- **Configuración:** barra de completitud en una sola línea desktop; asteriscos inline; validación RUC; preview documental; historial y savebar sticky.
- **Mobile:** jerarquía táctil, cards compactas, estados semánticos, precio/checklist de producto completos, preview de configuración visible y ausencia de scroll horizontal.

## Hallazgos y correcciones

### Primera pasada

- `[P2]` Taxonomía, Producto, Proveedor y Configuración tenían espacio vertical sin contenido decisional en paneles desktop.
  - Corrección: se añadieron acciones/revisión editorial en Taxonomía, cobertura y alertas de marcas, lectura de inventario/precio/relaciones, contexto de proveedor y health/versionado de configuración.
- `[P2]` Producto mobile recortaba el bloque inferior de preparación para publicar.
  - Corrección: se compactaron atributos secundarios, se mantuvieron SKU/modelo/compatibilidad, se redujo la tabla móvil a la fila prioritaria + total y se ajustó la altura del checklist.

### Segunda pasada

- `[P1]` En Configuración la barra de completitud declaraba seis elementos pero tenía cinco tracks y `Integraciones` caía a una segunda fila.
  - Corrección: grid desktop `1.1fr + repeat(5, 1fr)`; se volvió a capturar y verificar la línea completa.
- `[P2]` La tarjeta de inventario móvil todavía dejaba la cifra de precio parcialmente fuera del bloque.
  - Corrección: se ajustó la altura del bloque y se ocultó sólo la segunda fila de local en mobile para preservar el precio y el total sin overflow.

### Resultado final

No quedan diferencias visuales P0/P1/P2 accionables en las capturas finales. La lámina mantiene los límites intencionales del ticket: controles visuales sin mutaciones, datos de composición no operativos y ausencia de browser QA autenticado de ColdPower porque el prompt prohíbe levantar la app.

## Interacciones y límites validados

- Query-string `screen=taxonomia|producto|proveedor|configuracion` muestra exactamente una superficie.
- La navegación activa cambia por superficie; los estados seleccionados, tabs, badges, acciones secundarias, CTA primario, advertencias y savebar son visibles en el estado de diseño aprobado.
- `document.documentElement.scrollWidth` coincide con el viewport en las ocho capturas.
- Se revisaron assets cargados, errores de consola, errores de página y requests fallidos en cada captura.
- No se afirma funcionalidad de endpoints, RBAC, persistencia, teclado completo, axe o autenticación: esas pruebas pertenecen a la implementación posterior y requieren el runtime real.

final result: passed
