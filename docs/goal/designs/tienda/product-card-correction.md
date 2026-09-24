# Corrección de tarjeta de producto — Brief 11

Referencia visual: `product-card-correction.png` (generada para este ticket).

## Decisión aprobada

- La disponibilidad queda anclada arriba a la izquierda de la imagen.
- `Comparar` es una acción secundaria y nunca comparte el eje superior con la disponibilidad; se ancla abajo a la derecha de la imagen.
- El pie mantiene la identidad comercial en este orden: marca, nombre, SKU, un dato técnico clave.
- Cuando no existe precio publicado se muestra `Precio bajo cotización`; la CTA única es `Cotizar`.
- Cuando existe precio y el producto es comprable, la CTA única es `Agregar al carrito`.
- Cuando existe precio pero no se puede comprar, se conserva la salida honesta de cotización.
- La tarjeta completa sigue conduciendo a la ficha mediante imagen, nombre y SKU; no se agrega una segunda CTA visual.

## Responsive

- Desktop 1920 × 1080: imagen cuadrada, chips legibles y botón de ancho completo.
- Mobile 390 px: la grilla conserva dos columnas; el control de comparación no invade el chip de disponibilidad ni el chip `Imagen referencial`.
- Los textos de precio/estado no duplican el texto de la CTA.

## Criterio de revisión

La corrección se verifica en catálogo, búsqueda, relacionados y home, con producto con precio y sin precio, además de teclado, ausencia de overflow y consola limpia.
