# CP-027 Bloque B — Diseño de catálogo administrativo, CMS y media

## Objetivo

Completar la administración editorial de ColdPower para que personal autorizado pueda editar información comercial, gobernar publicaciones y reutilizar imágenes y contenido desde Administración, sin destruir la trazabilidad del catálogo ACSOFT ni exponer borradores al público.

## Decisiones

1. `products` sigue siendo la fuente maestra de identidad técnica. Se agregan únicamente campos editoriales (`commercial_name` y `featured`) y se conserva `original_name` sin modificación.
2. La multimedia se gobierna con `media_assets` y `media_asset_usages`. Un asset puede reutilizarse en productos, categorías, marcas, páginas y bloques; la relación contiene slot y orden.
3. El almacenamiento de desarrollo será disco local persistente fuera de `public/` (`tmp/media`). La URL pública será `/api/media/:id`, con control de estado y streaming. La interfaz de almacenamiento queda encapsulada para migrar después a R2/S3 o al volumen de Hetzner sin cambiar el CMS.
4. El CMS usará `cms_pages` y `cms_blocks` con contenido JSON validado por tipo. Se soportan páginas `home`, `nosotros`, `contacto` y `footer`, además de bloques `hero`, `banner`, `text`, `contact`, `links` y `promo`.
5. Todo contenido y media tiene estado. El público solo consulta registros `published`/`active`; los cambios administrativos son server-side, transaccionales cuando afectan varias tablas y auditados.
6. No se cargan precios, stock, teléfonos, correos, promociones ni imágenes de negocio sin una fuente real. Si no hay contenido CMS publicado, la web conserva sus componentes existentes y no muestra CTA ficticios.

## Modelo de datos

- `products.commercial_name`: nombre comercial editable, nullable.
- `products.featured`: selección editorial, default false.
- `media_assets`: archivo, URL lógica, MIME, bytes, dimensiones, alt text, tipo, estado, usuario y timestamps; soft delete mediante `deleted_at`.
- `media_asset_usages`: asset, entidad, entidad ID, slot y orden; evita asociaciones duplicadas.
- `cms_pages`: slug, título, estado, versión editorial, usuario y timestamps.
- `cms_blocks`: página, clave, tipo, payload JSON, orden y estado; clave única por página.

## Seguridad y validación

- `catalog.product.edit`, `catalog.product.publish`, `catalog.media.upload` y `cms.edit` se verifican en cada ruta.
- La subida acepta solo `image/png`, `image/jpeg`, `image/webp` y `image/svg+xml`, con límite de 10 MiB; el nombre original no se usa como ruta.
- Se comprueba la firma/binario de PNG, JPEG y WebP; SVG se almacena como texto saneado sin scripts ni eventos.
- La eliminación es lógica y se rechaza si existen usos activos, salvo que el administrador primero desasocie el asset.
- El público nunca recibe assets eliminados ni bloques no publicados.

## API y experiencia

- `GET/PATCH /api/admin/catalogo/:id` para consultar y editar campos comerciales permitidos.
- `POST/DELETE /api/admin/media` para subir y eliminar lógicamente; `GET /api/admin/media` lista activos y permite buscar.
- `POST/DELETE /api/admin/media/:id/usages` para asociar y desasociar assets.
- `GET/PATCH /api/admin/cms/:slug` para editar y publicar una página con bloques.
- `GET /api/media/:id` sirve únicamente media activa.
- Administración tendrá formularios de edición de producto, media y CMS; cada éxito refresca datos y cada error se muestra sin perder el formulario.

## Publicación

El repositorio público resolverá nombre comercial, descripción editorial, `featured`, imágenes activas ordenadas y bloques CMS publicados. No se cambia la regla existente que exige producto publicado, activo y sin bloqueos editoriales.

## Pruebas y QA

- Contratos de esquema, permisos, validación binaria, SVG, límite de tamaño, usos activos y payload CMS.
- Tests de ruta para autorización y auditoría.
- TypeScript, lint, build, migración idempotente, QA de Neon sin cambios en las 1,348 filas fuente y smoke HTTP local mediante el túnel activo.

## Rollback

Antes de la migración se ejecuta backup lógico. El rollback elimina solo tablas/campos agregados en una migración documentada; no borra productos, histórico ni auditoría existente. Los archivos del disco quedan fuera del catálogo y pueden conservarse para recuperación.
