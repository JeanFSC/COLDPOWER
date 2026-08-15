# CP-026B — Piloto editorial real del catálogo

Fecha: 2026-08-15  
Entorno verificado: `http://localhost:3000` y `https://dev.coldpower.pe`  
Alcance: publicación controlada de cuatro productos importados para QA público.

## Resultado

Se publicaron cuatro productos reales mediante `changePublicationStatus`, con actor editorial `SUPERADMIN`, aprobación de la revisión y registro de auditoría. No se modificaron SKU, nombre, marca, precio, stock, categoría ni familia.

| SKU | Slug / PDP | Categoría | Familia | Marca | Estado público | Media |
|---|---|---|---|---|---|---|
| `CP-REF-MCP-0995` | `/producto/motocompresor-embraco-1-2-hp-nek-2134gk-r404-220-v` | Refrigeración | Motocompresores | Embraco | `published` / consultar disponibilidad | Fallback editorial |
| `CP-REF-VEN-0844` | `/producto/ventilador-de-12-v-rfd-3410a101a-eau65058501-lg` | Refrigeración | Ventiladores | LG | `published` / consultar disponibilidad | Fallback editorial |
| `CP-REF-CAP-0412` | `/producto/capacitor-25-µf-450-v-coldpower` | Refrigeración | Capacitores | ColdPower | `published` / consultar disponibilidad | Fallback editorial |
| `CP-REF-TAR-0810` | `/producto/tarjeta-lg-con-cable-6871jb1103h` | Refrigeración | Tarjetas electrónicas | LG | `published` / consultar disponibilidad | Fallback editorial |

No había media activa asociada a estos registros. La UI muestra la imagen referencial existente; no se inventaron fotografías.

Estado final de base de datos:

- 4 productos `published`.
- 1,344 productos permanecen en `review`; no hubo publicación masiva.
- 4 registros de auditoría de publicación nuevos (auditoría total: 76).
- Precio público: `null` en los cuatro productos.
- Imágenes públicas: `[]` en los cuatro productos.
- Disponibilidad pública: `on-request`, porque no existen saldos de inventario cargados.

## URLs y APIs verificadas

Categoría común:

- Local: `http://localhost:3000/categoria/refrigeracion`
- Desarrollo público: `https://dev.coldpower.pe/categoria/refrigeracion`

Los dos respondieron HTTP 200 y mostraron 4 referencias.

Pruebas de API:

- `GET /api/catalog/search?q=CP-REF-MCP-0995&limit=4`: HTTP 200, respuesta no vacía.
- `GET /api/catalog/products?ids=product-cp-ref-mcp-0995,product-cp-ref-ven-0844,product-cp-ref-cap-0412,product-cp-ref-tar-0810`: HTTP 200, 4 productos.
- Las mismas dos pruebas pasaron en localhost y en `dev.coldpower.pe`.
- Un producto no publicado (`CP-REF-OTR-0435`) devolvió `products: []` tanto por búsqueda como por IDs.

El flujo de cotización se probó sin crear una solicitud comercial de prueba: carrito GET vacío, POST de una referencia publicada, lectura visual del carrito y DELETE para limpiarlo; todas las respuestas fueron HTTP 200.

## QA visual posterior

Con Playwright se verificaron home, catálogo, categoría, PDP y cotización. El catálogo mostró las cuatro tarjetas con SKU, marca, jerarquía, especificaciones disponibles, CTA de cotizar y fallback de imagen. La ficha mostró categoría, familia, marca, descripción editorial, especificaciones y CTA. La cotización mostró la referencia, SKU, cantidad y limpieza del carrito.

Evidencia local generada en `output/playwright/`:

- `cp026b-catalog-final.png`
- `cp026b-category-final.png`
- `cp026b-product-final.png`
- `cp026b-product-capacitor-final.png`
- `cp026b-quote-final.png`

## Corrección encontrada durante QA

El PDP del capacitor devolvía 404 cuando el segmento URL llegaba codificado como `%C2%B5` o como mojibake. Se corrigió la resolución interna de slugs en `src/lib/catalog-repository.ts` para aceptar la variante importada y sus representaciones URL-encoded, sin cambiar el slug persistido ni el contrato de las APIs. Se añadió la regresión `scripts/cp026b-slug.test.ts`.

Después de la corrección, los cuatro PDP respondieron HTTP 200 en ambos orígenes, incluido:

- `http://localhost:3000/producto/capacitor-25-%C2%B5f-450-v-coldpower`
- `https://dev.coldpower.pe/producto/capacitor-25-%C2%B5f-450-v-coldpower`

## Archivos de este ticket

- `scripts/cp026b-candidates.ts`: selección y gate de candidatos reales.
- `scripts/cp026b-publish-sample.ts`: publicación reproducible de las cuatro referencias mediante el servicio editorial.
- `scripts/cp026b-slug.test.ts`: regresión para slugs codificados.
- `src/lib/catalog-repository.ts`: normalización defensiva de slug para resolver el PDP.
- `docs/qa/cp026b-catalog-pilot-2026-08-15.md`: esta evidencia.

No se modificaron los contratos de `/api/catalog/products`, `/api/catalog/search`, carrito/cotización, RBAC, inventario ni historial de importación.
