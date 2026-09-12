# CP-031 · Rediseño de gestión de productos

Fecha de verificación: 2026-08-31  
Repositorio: `C:\Users\jean_\Desktop\COLDPOWER`

## 1. SHA base

El SHA de referencia solicitado por el ticket (`00ca...`) no existe en el checkout local. La base verificable actual es `df60352`.

## 2. Rama

`main`, con seis commits locales por delante de `origin/main`. No se creó una rama nueva.

## 3. SHA final

No se creó un SHA final: no se hizo commit ni push. El trabajo queda en el working tree posterior a `df60352`.

## 4. Archivos modificados

Cambios CP-031 principales: `src/app/admin/catalogo/page.tsx`, `src/components/admin/AdminProductCatalog.tsx`, `src/components/admin/ProductCreateForm.tsx`, `src/components/admin/DuplicateDecisionControl.tsx`, `src/components/admin/AdminShell.tsx`, `src/lib/catalog-admin-contract.ts` y `src/lib/catalog-admin-service.ts`.

## 5. Archivos nuevos

`src/components/admin/CatalogImportDialog.tsx`, `src/lib/catalog-quality.ts`, `src/lib/catalog-import-service.ts`, las rutas `src/app/api/admin/catalogo/import/` y `src/app/api/admin/catalogo/bulk/`, y este reporte. Los cambios no relacionados de inventario, dashboard y pricing se conservaron.

## 6. Migraciones

No se añadió migración CP-031: el catálogo usa el esquema persistente existente en PostgreSQL/Neon y no introduce tablas paralelas ni arrays locales.

## 7. APIs

Se mantienen `GET/POST /api/admin/catalogo`, `GET/PATCH /api/admin/catalogo/:id`, `/duplicate` y `/media`. Se añadieron importación controlada, `POST /api/admin/catalogo/bulk/preflight` y `PATCH /api/admin/catalogo/bulk`.

## 8. Queries

La página consulta PostgreSQL con búsqueda server-side sobre SKU, nombres, marca, taxonomía, aplicación, refrigerante, voltaje, potencia, capacitancia, dimensiones y demás atributos técnicos. Media, precios, inventario agregado, facetas, colas y resúmenes se obtienen en lotes y la lista se pagina en servidor.

## 9. Componentes

`AdminProductCatalog` compone cabecera, cinco KPIs, filtros, tabla, rail de resumen, workspace masivo, drawer y modales. `ProductCreateForm`, `CatalogImportDialog` y `DuplicateDecisionControl` cubren las mutaciones solicitadas.

## 10. Fórmulas exactas de KPI

Los cinco KPIs son globales y vienen de las colas persistentes: total de referencias, publicadas, borradores, en revisión y duplicados editoriales pendientes. Las etiquetas y enlaces conservan el alcance de cada consulta.

## 11. Fórmula exacta de calidad

La puntuación suma 100 puntos: identificación/taxonomía 25, datos técnicos 25, comercial 20, multimedia 20 y editorial 10. La clasificación es buena desde 80, aceptable desde 60 y baja por debajo de 60; también se devuelve la lista de campos faltantes.

## 12. Filtros

La UI soporta búsqueda, categoría, familia, marca, estado editorial, calidad, requiere revisión, duplicado/decisión, confianza de normalización, estado fuente y presencia de marca, media o precio. Los chips conservan estado al paginar.

## 13. Ordenamiento

El contrato valida una allowlist server-side para nombre, SKU, categoría, marca, estado y actualización, con dirección ascendente o descendente. La navegación no ejecuta ordenamiento arbitrario en el cliente.

## 14. Nuevo producto

El modal exige categoría antes de familia, valida SKU único, conserva la identidad importada fuera del formulario y crea mediante el servicio transaccional con auditoría. Tras crear, el catálogo busca el SKU persistido y abre su ficha exacta.

## 15. Importación

El wizard trabaja en tres estados visibles: archivo, previsualización y resultado. Primero ejecuta dry-run; columnas desconocidas bloquean la confirmación, SKU existentes se reportan sin sobrescribir y los productos nuevos se crean en revisión dentro de una transacción con auditoría por lote y producto.

## 16. Publicación

La publicación usa transiciones válidas y `evaluatePublication`. El preflight real muestra elegibles y bloqueos antes de persistir; un producto con descripción insuficiente, revisión pendiente o duplicado sin decisión no se publica silenciosamente.

## 17. Operación masiva

La selección y el endpoint transaccional soportan publicar, enviar a revisión y ocultar, con resultados parciales explícitos, motivo de fallo por SKU y auditoría de cada cambio más el evento de lote.

## 18. Drawer

La ficha carga por ID desde la API y separa identidad de origen read-only, edición comercial, contenido, multimedia, comercial, inventario e historial. Escape y el overlay cierran el drawer.

## 19. Duplicados

Los grupos pendientes se calculan con datos reales globales, no sólo con la página visible. El modal compara SKU, nombre, marca, categoría y referencia; permite marcar diferentes, confirmado, mantener ambos o pendiente y elegir canónico cuando corresponde.

## 20. Media

La ficha distingue imagen principal y galería, presenta alt text y estado vacío honesto. La consulta por lote evita etiquetar falsamente una galería como imagen principal.

## 21. Pricing

Los precios se leen desde los registros vigentes reales y sólo se muestran con permiso `pricing.view`, incluyendo moneda y tipos minorista, mayorista y mínimo. No se inventa precio para completar una tarjeta.

## 22. Inventory

El drawer muestra físico, reservado, disponible y locales usando inventario agregado. Disponible es físico menos reservado; un valor desconocido permanece desconocido y no se convierte en cero.

## 23. RBAC

La página y cada API requieren permisos de catálogo. Crear, editar, publicar, revisar, precios e inventario se ocultan o deshabilitan según el actor y se vuelven a validar en servidor.

## 24. Auditoría

Crear, editar, cambiar publicación, revisar duplicados, importar y operar en lote escriben `auditLogs` con actor, rol, entidad, antes/después y metadatos de SKU o lote.

## 25. Loading

El drawer y las superficies asíncronas tienen skeletons; los botones mutantes muestran estados ocupados. El panel evita presentar datos transitorios como si fueran resultado definitivo.

## 26. Error

Las rutas devuelven errores tipados y códigos HTTP coherentes. El catálogo muestra el mensaje operativo y el flujo de importación conserva el paso de validación cuando el servidor rechaza el archivo.

## 27. Empty

Las listas vacías, media faltante, historial vacío y duplicados sin pendientes tienen estados explícitos. No se usan productos, precios, stock ni imágenes ficticias.

## 28. Responsive

Se verificaron capturas a 1440, 1024, 768 y 390 px. El sidebar pasa a menú por debajo de `xl`, los KPIs se apilan y no se detectó overflow horizontal del documento en móvil.

## 29. Performance/N+1

La lista no hace fetch por fila: media, precio e inventario se agrupan por IDs. El detalle se solicita sólo al abrir el drawer y la consulta de duplicados se realiza en una carga server-side limitada.

## 30. Tests

Pasaron 5/5 pruebas dirigidas: view-model, seguridad de compatibilidad, métricas CP-029 y navegación/paginación del catálogo. La suite histórica `test:cp031` queda en 15/16 por un contrato previo del dashboard que esperaba el parser antiguo, fuera del módulo de productos. `test:inventory` mantiene un bloqueo por ausencia del workbook externo en `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\...xlsx`; no se fabricó ese archivo.

## 31. TypeScript

La ejecución final de `tsc --noEmit` queda bloqueada por un error de sintaxis preexistente en `src/components/admin/PricingWorkspace.tsx:225` (archivo fuera del conjunto CP-031). En una ejecución anterior también afloraron errores de props en el workspace de inventario, igualmente ajenos.

## 32. Lint

`corepack pnpm lint` termina con código 0 y sin errores. Quedan warnings preexistentes del repositorio en dashboard, configuración, inventario, pricing y repositorios; el warning específico de `duplicateCandidates` del catálogo fue eliminado.

## 33. Build

`next build` compila el bundle correctamente, pero el type-check global no permite finalizar por los errores ajenos indicados en el punto 31. No hay error de compilación reportado en las superficies CP-031.

## 34. Screenshots

Capturas requeridas disponibles en `output/playwright/`: `cp031-productos-1440.png`, `cp031-productos-1024.png`, `cp031-productos-768.png`, `cp031-productos-390.png`, `cp031-product-detail.png`, `cp031-new-product.png`, `cp031-import-preview.png`, `cp031-publication-preflight.png`, `cp031-bulk-operation.png` y `cp031-duplicate-review.png`.

## 35. Diferencias justificadas

La referencia visual adjunta es un dashboard admin de ColdPower (`C:\Users\jean_\.codex\attachments\1942beb9-90bc-47c5-a52c-20985d9194ad\image-1.png`), mientras CP-031 solicita catálogo. Se conserva su lenguaje visual —sidebar blanca, navy activo, canvas azul-gris, tarjetas compactas y acentos azul/naranja/verde/rojo/morado— y se adapta la jerarquía al trabajo de productos, filtros y gobierno editorial.

## 36. Bloqueadores restantes

No hay bloqueador funcional conocido dentro de CP-031. Quedan dos límites del entorno: el workbook de inventario no está disponible para `test:inventory`, y el type-check/build global está afectado por archivos de pricing/inventario fuera del módulo. No se hizo commit ni push porque el ticket adjunto no sustituye una autorización explícita del usuario para publicar cambios.
