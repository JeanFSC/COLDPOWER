# Producto · evidencia M10-04 lote 2

Estado: cerrada.

## Capturas

- [Desktop 1920 × 1080](producto-1920x1080.png)
- [Mobile 390 × 844](producto-390x844.png)
- [Drawer de edición editorial](producto-editor-drawer-1920x1080.png)
- [Pestaña de imágenes](producto-imagenes-1920x1080.png)
- [Desktop final tras el flujo](producto-final-1920x1080.png)
- [Mobile final tras el flujo](producto-final-390x844.png)

## Comparación con la lámina

Se comparó contra `docs/goal/designs/m10-lote2/detalle-producto-desktop-1920x1080.png` manteniendo la jerarquía de ficha, atributos, precio/inventario, checklist y vista de tienda. Se usó el registro real `CP-REF-MCP-0103` de PostgreSQL; por eso el producto visible es Tecumseh y su precio real es `S/ 1250.00`, no el producto ficticio de la referencia. El precio se mantiene en una sola línea, la UI editorial está en español, la vista de tienda no inventa estrellas y Publicar queda deshabilitado con la razón del checklist y el permiso.

## Interacciones y accesibilidad

- Se verificaron las pestañas Ficha, Precios e Imágenes.
- Se programó desde `Nuevo precio` un reemplazo minorista con el importe real `S/ 1250.00`, vigencia futura `01 oct. 2027` y motivo `Validación de flujo M10-04`; la UI confirmó el versionado.
- Se subió desde `Imágenes` el asset existente `public/images/products/placeholder-compresores.webp`; tras recargar se mostró como `Imagen principal` y el checklist avanzó a `5 de 6`.
- Se abrió y canceló el drawer `Editar ficha` sin mutar los campos editoriales.
- El control Publicar se comprobó deshabilitado porque falta la descripción editorial.
- Axe: [axe.json](axe.json), `violations: []`, `incomplete: []`.
- Consola: [producto-console.txt](producto-console.txt), 0 errores. Las advertencias observadas son de desarrollo/preload durante Fast Refresh; no hay excepciones de ejecución.
- Snapshots: [ficha](producto-ui-ficha.txt), [imágenes](producto-ui-imagenes.txt), [precios](producto-ui-precios.txt), [drawer](producto-editor-drawer-ui.txt), [flujo final](producto-ui-final.txt).

## Recorrido UI + SQL

1. Carga autenticada de `/admin/catalogo/product-cp-ref-mcp-0103` en desktop y mobile.
2. Se validaron categoría `Refrigeración`, familia `Motocompresores`, marca `Tecumseh`, estado publicado/disponible y SKU inmutable.
3. Se verificaron precio minorista PEN `1250.00`, inventario disponible `1060` en Almacén Lima, la media propia real `placeholder-compresores.webp` y una promoción activa.
4. La consulta de control post-flujo está en [sql-journey.txt](sql-journey.txt) y conserva el historial del reemplazo de precio.
