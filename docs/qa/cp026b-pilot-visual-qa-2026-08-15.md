# CP-026B — QA visual posterior al piloto de catálogo

Fecha: 2026-08-15
Entornos: `http://localhost:3000` y `https://dev.coldpower.pe`
Alcance: verificar la experiencia pública con las cuatro referencias reales publicadas por el flujo editorial.

## Estado verificado

- La base contiene 4 productos `published` y 1,344 productos en `review`.
- La categoría `Refrigeración` muestra 4 referencias.
- Los productos conservan precio `null`, imágenes públicas vacías y disponibilidad `on-request`; no se inventaron datos.
- La UI usa el fallback editorial referencial permitido cuando no existe media activa.
- No se modificaron componentes UI, contratos de catálogo/cotización, RBAC, inventario ni historial de importación.

## Flujos probados

- Home: carga de categorías y referencias publicadas.
- Catálogo: grid real con conteo de 4 referencias, filtros y tarjetas.
- Categoría: `/categoria/refrigeracion` responde y lista las 4 referencias.
- PDP: la ficha del motocompresor responde HTTP 200 y muestra SKU, marca, categoría, familia, estado comercial, especificaciones y CTA.
- PDP con slug codificado: el capacitor responde HTTP 200 con `µ` URL-encoded.
- Cotización: `GET` vacío, agregar una unidad, modificar cantidad a 2 y eliminar la línea; cada operación respondió HTTP 200 y el carrito terminó vacío.
- Consola Playwright: 0 errores de aplicación en las vistas capturadas; quedó 1 warning no bloqueante de desarrollo por vista.

## Dimensiones y evidencia

Se capturaron home, catálogo, categoría, PDP y cotización en los tres tamaños requeridos:

- Desktop: 1440×1000.
- Tablet: 1024×900.
- Mobile: 390×844.

Las capturas están versionadas en `docs/qa/cp026b-pilot/`:

### Desktop

- `cp026b-pilot-home-desktop-1440.png`
- `cp026b-pilot-catalog-desktop-1440.png`
- `cp026b-pilot-category-desktop-1440.png`
- `cp026b-pilot-product-desktop-1440.png`
- `cp026b-pilot-quote-desktop-1440.png`

### Tablet

- `cp026b-pilot-home-tablet-1024.png`
- `cp026b-pilot-catalog-tablet-1024.png`
- `cp026b-pilot-category-tablet-1024.png`
- `cp026b-pilot-product-tablet-1024.png`
- `cp026b-pilot-quote-tablet-1024.png`

### Mobile

- `cp026b-pilot-home-mobile-390.png`
- `cp026b-pilot-catalog-mobile-390.png`
- `cp026b-pilot-category-mobile-390.png`
- `cp026b-pilot-product-mobile-390.png`
- `cp026b-pilot-quote-mobile-390.png`

## URLs verificadas

- Categoría local: `http://localhost:3000/categoria/refrigeracion`
- Categoría pública: `https://dev.coldpower.pe/categoria/refrigeracion`
- PDP local: `http://localhost:3000/producto/motocompresor-embraco-1-2-hp-nek-2134gk-r404-220-v`
- PDP público: `https://dev.coldpower.pe/producto/motocompresor-embraco-1-2-hp-nek-2134gk-r404-220-v`
- Cotización local: `http://localhost:3000/cotizacion`
- Cotización pública: `https://dev.coldpower.pe/cotizacion`

Las rutas HTML y `GET /api/catalog/search?q=CP-REF-MCP-0995&limit=4` respondieron HTTP 200 en ambos orígenes.

## Observaciones honestas

- Las tarjetas y la PDP muestran imagen referencial, porque los cuatro registros no tienen media activa publicada.
- Precio y stock no aparecen como valores ficticios; se solicita disponibilidad y cotización.
- El warning observado pertenece al entorno de desarrollo y no produjo errores de aplicación ni fallas funcionales.
- Los textos legales siguen fuera de este ticket y requieren aprobación antes de publicarse como contenido definitivo.
