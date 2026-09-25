# ColdPower · M10 lote 2

## Estado y alcance

Estas láminas son una propuesta visual estática para cuatro superficies administrativas:

1. Taxonomía (`taxonomia`).
2. Detalle de producto (`catalogo/[id]`).
3. Detalle de proveedor (`compras/proveedores/[id]`).
4. Configuración (`configuracion`).

La entrega no modifica `src/`, la base de datos, `.env.local` ni `proxy.ts`, y no levanta el servidor de ColdPower. La fuente reproducible es `lamina/m10-lote2.html`; el render se ejecuta con `lamina/render.cjs` y una instalación local de Playwright dentro de `lamina/`.

Los nombres, SKU, conteos, montos y fechas que aparecen en las imágenes son **datos de composición visual** para demostrar jerarquía, densidad y estados. No son una extracción operativa ni una fixture que deba importarse. En una implementación, cada valor se reemplaza por el contrato indicado en las tablas de mapeo y los estados se derivan en servidor.

## Entregables

| Superficie | Desktop | Mobile |
| --- | --- | --- |
| Taxonomía | `taxonomia-desktop-1920x1080.png` | `taxonomia-mobile-390x844.png` |
| Detalle de producto | `detalle-producto-desktop-1920x1080.png` | `detalle-producto-mobile-390x844.png` |
| Detalle de proveedor | `detalle-proveedor-desktop-1920x1080.png` | `detalle-proveedor-mobile-390x844.png` |
| Configuración | `configuracion-desktop-1920x1080.png` | `configuracion-mobile-390x844.png` |

- Prototipo reproducible: `lamina/m10-lote2.html`.
- Captura y verificación: `lamina/render.cjs`.
- Dependencia aislada para la captura: `lamina/package.json` y `lamina/package-lock.json`.

## Decisión de diseño compartida

La interfaz sigue el shell administrativo aprobado en `docs/goal/designs/promociones/promociones-desktop-1920x1080.png` y el lenguaje de `docs/goal/META-10.md` §3.

- Sidebar fija de aproximadamente `198 px`, topbar de `76 px`, fondo de workspace `#f8fafc` y gutter principal de `36 px`.
- En mobile, la sidebar desaparece y el topbar compacto conserva menú, lockup, notificaciones y avatar.
- Navegación agrupada en General, Comercial, Operación, Catálogo y Gestión. El ítem activo usa `#102f51`.
- `#2563eb` / `blue-600` es el único primario administrativo. Naranja/amber sólo comunica atención, vencimiento o riesgo; nunca es CTA principal.
- Tarjetas: `rounded-xl`, borde `slate-200/90`, superficie blanca y sombra `shadow-2xs`.
- Etiquetas: uppercase, compactas y con tracking; códigos, SKU, RUC y referencias documentales en IBM Plex Mono.
- Estados combinan texto, icono y color. No se usa color como único indicador.
- Los montos se presentan en PEN con formato `S/ 1,240.00`; fechas y auditoría usan hora de Lima.
- No se crean ilustraciones ni placeholders por CSS. El lockup se carga desde `public/brand/logo-coldpower-lockup.webp` y el producto usa `public/images/products/placeholder-compresores.webp`, un asset existente del catálogo.

## 1. Taxonomía

### Objetivo del rol

El equipo de Catálogo debe responder en una misma vista cómo está organizado el catálogo, qué nodos tienen problemas editoriales y qué impacto tendría renombrar, mover o desactivar una categoría. La composición usa maestro-detalle en tres columnas, no una lista plana de categorías.

### Desktop

- Encabezado `Catálogo / Estructura`, título `Taxonomía`, explicación de una línea y acciones `Exportar` y `Nueva categoría`.
- KPIs: categorías activas, familias, marcas activas y productos sin marca. Cada KPI incluye contexto o tendencia; `Productos sin marca` es el riesgo accionable en amber.
- Columna izquierda: árbol navegable categoría → familia, búsqueda, conteo por nodo, badge `Vacía` y alerta de nombres similares.
- Columna central: `Refrigeración` seleccionada, slug editable, estado, productos totales/publicados/en revisión, familias hijas, marcas principales, acciones del nodo y advertencia de impacto antes de desactivar.
- Columna derecha: buscador de marcas, estado, conteo de productos, cobertura editorial, atención pendiente y detalle compacto de la marca seleccionada.

### Mobile

- Tabs `Árbol / Detalle / Marcas`; la captura muestra `Árbol` activo y la hoja del nodo seleccionado debajo.
- El árbol es compacto y colapsable; los conteos se conservan junto al nombre.
- El detalle se convierte en una hoja con métricas y familias; marcas vive como pestaña separada.
- La advertencia de duplicidad se mantiene visible y no se oculta bajo un menú.

### Mapeo dato → persistencia

| Dato visible | Fuente real | Regla de lectura/presentación |
| --- | --- | --- |
| Nombre, slug y estado de categoría | `src/db/schema.ts` → `categories.name`, `categories.slug`, `categories.active` | `active = true` → `Activa`; `false` → `Inactiva`. El slug se muestra en mono y es editable sólo mediante mutación autorizada. |
| Nombre, slug, categoría padre y estado de familia | `families.name`, `families.slug`, `families.categoryId`, `families.active` | La jerarquía se arma por `categoryId`; no se aplana familia dentro de categoría. |
| Nombre, slug y estado de marca | `brands.name`, `brands.slug`, `brands.active` | La lista de marcas se filtra server-side y el detalle se abre en drawer en la implementación. |
| Productos por nodo | `products.categoryId`, `products.familyId`, `products.brandId` | Conteos por relación; `countDistinct(products.id)`. No contar filas de media, precios o inventario como productos. |
| Taxonomía editorial | `products.editorialCategoryId`, `products.editorialFamilyId`, `products.editorialBrandId` | Se presenta como la asignación que sobrescribe la taxonomía de origen en tienda; origen y editorial no se confunden. |
| Productos publicados / en revisión | `products.publicationStatus` | Traducir al microcopy de negocio; no exponer el enum técnico como texto principal. |
| Productos sin marca | `products.brandId` y, si aplica, `products.editorialBrandId` | La métrica debe declarar si cuenta origen, editorial o ambos; la implementación debe fijar esa regla en el repositorio y no inferirla en cliente. |
| Alertas de nodo vacío | ausencia de productos relacionados y/o ausencia de familias | `Vacía` sólo cuando el conteo derivado sea cero. No fabricar una categoría sin relación. |
| Advertencia de duplicidad | `categories.name` / `families.name` y normalización editorial | Es una revisión de nombres similares; no fusionar ni cambiar slugs automáticamente. |
| Advertencia de impacto | conteo de productos publicados relacionado al nodo + `publicationStatus` | Antes de desactivar, el servidor debe recalcular el impacto y exigir confirmación. |

## 2. Detalle de producto

### Objetivo del rol

Catálogo necesita saber si el producto está listo para publicar, qué información técnica controla la búsqueda, cuánto stock hay por local y qué precio está vigente. La pantalla prioriza el checklist y la vista en tienda junto a la ficha, no formularios aislados de precio y stock.

### Desktop

- Encabezado con miniatura real, nombre comercial, SKU mono, modelo y chips `En revisión`, `Disponible` y `Requiere imagen editorial`.
- `Ver en tienda` es una acción secundaria; `Publicar` se muestra deshabilitado porque el checklist no está completo.
- Pestañas `Ficha`, `Precios`, `Inventario`, `Imágenes` e `Historial`; la captura muestra `Ficha` activa.
- Columna principal: ficha comercial, atributos técnicos y resumen de precio/inventario por local con último ajuste.
- Rail derecho fijo: `Preparación para publicar`, `Vista en tienda` y promociones aplicables.
- El SKU se mantiene inmutable visualmente; cambios de precio, inventario o media se realizarán con drawers y auditoría.

### Mobile

- La identidad conserva miniatura, nombre, SKU y estados en el primer bloque.
- Tabs compactas sin overflow horizontal de la página.
- Se priorizan ficha, atributos de mayor decisión, precio minorista, disponibilidad y checklist. El rail derecho se convierte en bloque inferior; la vista en tienda y promociones se continúa en sus tabs/hojas.
- La captura termina con el checklist completo, incluido el pendiente de imagen, sin cortar el control de publicación.

### Mapeo dato → persistencia

| Dato visible | Fuente real | Regla de lectura/presentación |
| --- | --- | --- |
| SKU, slug y nombres | `src/db/schema.ts` → `products.sku`, `products.slug`, `products.commercialName`, `products.normalizedName`, `products.originalName` | Priorizar `commercialName`; fallback sólo según contrato. `sku` es mono, único e inmutable. |
| Modelo y atributos técnicos | `products.modelCode`, `voltage`, `power`, `frequency`, `rpm`, `amperage`, `capacitance`, `refrigerant`, `horsepower`, `temperature`, `dimensions`, `length`, `connectionSize`, `unitOfMeasure` | Mostrar sólo valores no nulos; nunca completar valores técnicos faltantes con estimaciones. |
| Categoría/familia/marca de origen | `products.categoryId`, `products.familyId`, `products.brandId` | Resolver nombre mediante relación autorizada. |
| Categoría/familia/marca editorial | `products.editorialCategoryId`, `products.editorialFamilyId`, `products.editorialBrandId` | Mostrar la marca `editorial` y distinguirla de `origen`; la editorial es la que gobierna la tienda cuando está presente. |
| Aplicación y compatibilidad | `products.application`, `products.compatibilityBrands` | `compatibilityBrands` se presenta como compatibilidad declarada; no convertir productos relacionados en compatibilidad. |
| Estados | `products.status`, `products.publicationStatus`, `products.availabilityStatus` | Mapear a `En revisión`, `Publicado`, `Disponible`, etc.; la etiqueta de negocio no expone `review`/`unknown` como enum. |
| Descripción editorial y revisión | `products.editorialDescription`, `publicationNote`, `requiresReview`, `reviewReason`, `possibleDuplicate`, `duplicateDecision` | El checklist enlaza al campo faltante; una posible duplicidad se mantiene como revisión, no como merge automático. |
| Imagen principal y galería | `media_assets` / `mediaAssets`, `mediaAssetUsages` | Resolver `mediaAssets.id`, estado y uso. Si no hay media principal, mostrar estado honesto `Falta imagen`, no una imagen inventada. |
| Precio minorista vigente | `product_prices` / `productPrices.amount`, `priceType`, `currency`, `validFrom`, `validUntil`, `active` | Seleccionar el registro vigente por tipo y ventana temporal; el cliente no recalcula vigencia. |
| Historial de precio | `price_history` / `priceHistory.previousAmount`, `newAmount`, `reason`, `changedBy`, `createdAt` | Timeline con motivo, actor autorizado y hora de Lima. |
| Stock por local | `locations.id`, `locations.name`, `inventory_balances.productId`, `locationId`, `onHand`, `reserved`, `minimumStock` | `disponible = onHand - reserved` sólo si el servicio lo define; no permitir valores negativos. |
| Relaciones | `product_relations.productId`, `relatedProductId`, `relationType`, `validated`, `note` | Mostrar `relacionado` sólo para relaciones explícitas y validadas; nunca afirmar compatibilidad por compartir familia. |
| Promociones aplicables | `operations-schema.ts` → `promotionProducts`, `promotionCategories`, `promotions`; efectos en `promotionApplications` | Resolver por alcance y vigencia; base, descuento y precio final deben venir del servicio de promociones. |
| Preparación para publicar | checklist existente del catálogo sobre nombre, categoría, familia, media y precio | El porcentaje es derivado del checklist; `Publicar` sólo se habilita bajo la condición real del endpoint. |

## 3. Detalle de proveedor

### Objetivo del rol

Compras debe decidir si el proveedor es confiable, qué órdenes están abiertas, qué recepciones ya se registraron, qué productos suministra y cómo contactarlo sin salir de la ficha. La superficie usa ancho completo para evitar el contenedor angosto y los KPIs `N/D` del estado actual.

### Desktop

- Encabezado con nombre, RUC mono, país, moneda, chip de estado y acciones `Crear OC`, `WhatsApp` y `Editar`.
- KPIs con contexto: OC abiertas y monto, On-time con n de entregas, Fill rate, lead time promedio e incidencias de 90 días.
- Columna izquierda: órdenes abiertas con estado, fecha esperada, retraso e importe; productos suministrados con SKU, último costo y variación.
- Columna derecha: recepciones recientes como timeline y contacto con acciones de llamada, WhatsApp y correo.
- Cuando no existan recepciones, el KPI debe decir `Sin entregas registradas aún` con ayuda; nunca `N/D`.

### Mobile

- Las acciones superiores se reducen a botones táctiles de 44 px: crear OC, WhatsApp y editar.
- KPIs pasan a 2×2 más una fila de incidencias.
- Órdenes abiertas, recepciones y contacto quedan en una secuencia vertical; productos se consulta desde la navegación secundaria.
- No hay tabla horizontal que fuerce scroll de la página.

### Mapeo dato → persistencia

| Dato visible | Fuente real | Regla de lectura/presentación |
| --- | --- | --- |
| Nombre, RUC, país, moneda y estado | `src/db/purchases-schema.ts` → `suppliers.name`, `identification`, `country`, `currency`, `status` | `country` se localiza a país visible; `currency` se muestra como PEN/USD según contrato. Estado se traduce a `Activo`/`Inactivo`. |
| Contacto | `suppliers.contactName`, `whatsapp`, `email`, `address` | Campo nulo se muestra como `Agregar teléfono`, `Agregar correo` o equivalente editable; nunca se inventa un dato de contacto. |
| Órdenes abiertas | `purchases.supplierId`, `code`, `locationId`, `status`, `currency`, `subtotal`, `issuedAt`, `expectedDeliveryAt` | Filtrar estados abiertos según la regla de compras; resolver local por `locations`. `PARTIAL_RECEIVED` se presenta como `Parcial`, no como enum. |
| Líneas de OC | `purchase_items.purchaseId`, `productId`, `skuSnapshot`, `productNameSnapshot`, `quantityOrdered`, `quantityReceived`, `unitCost`, `currency` | Fill rate = unidades recibidas / unidades ordenadas, con denominador y ventana visibles. |
| Recepciones | `purchase_receipts.purchaseId`, `code`, `locationId`, `status`, `receivedBy`, `receivedAt`; detalle en `purchase_receipt_items.quantity`, `unitCost`, `currency` | Sólo recepciones registradas y no canceladas; timeline con actor/local y hora de Lima. |
| Último costo por producto | `purchase_items.unitCost`, `currency`, orden/recepción más reciente relacionada | No usar precio minorista de `productPrices` como costo de proveedor. La variación compara compras del mismo producto y moneda. |
| Productos que suministra | `purchase_items.productId` → `products.id`, `skuSnapshot`, `productNameSnapshot` | Usar snapshot comercial de la línea para trazabilidad y relación con producto actual autorizado. |
| On-time | `purchases.expectedDeliveryAt` + fecha efectiva de `purchaseReceipts.receivedAt` | Calcular sólo con órdenes/recepciones comparables y mostrar el número de entregas. |
| Fill rate | `purchaseItems.quantityOrdered` y `quantityReceived` o suma de `purchaseReceiptItems.quantity` | No mostrar porcentaje si no existe denominador; usar el estado vacío honesto. |
| Lead time | `purchases.issuedAt` → `purchaseReceipts.receivedAt` | Promedio sólo de órdenes con fechas reales; unidad visible: días. |
| Incidencias | incidencias del dominio de compras, si el repositorio las expone | La captura deja el bloque preparado; implementación debe resolver fuente y estado real antes de mostrar número operativo. |

## 4. Configuración

### Objetivo del rol

Gerencia debe saber qué falta para operar y facturar, editar la información de empresa con validación y conservar un historial de quién cambió qué. La primera vista útil es la completitud, no KPIs de tendencia artificiales.

### Desktop

- Barra de completitud en una sola línea: Empresa, Locales, Series, IGV e Integraciones; cada elemento enlaza a su pestaña y conserva contexto.
- Tabs: Empresa, Locales, Series y documentos, Precios e IGV, Integraciones, Branding, Legal e Historial.
- Pestaña Empresa con formulario de dos columnas. El asterisco obligatorio queda en la misma línea de la etiqueta y la ayuda debajo del campo.
- RUC con validación visible; el primario es `Guardar cambios`. `Probar integración` no aparece en Empresa.
- Columna derecha con preview de documento/pie de tienda y último cambio versionado.
- Barra inferior pegajosa sólo porque hay cambios: `3 cambios sin guardar · Descartar · Guardar cambios`.

### Mobile

- La barra de completitud conserva Empresa, Locales e Integraciones; Series, IGV y el resto se consultan por tabs.
- Formulario de una columna visualmente compacto, sin etiquetas sueltas ni asteriscos en línea independiente.
- Preview de documento debajo del formulario y barra de guardado siempre alcanzable.
- Tabs contenidos en su propia fila; `scrollWidth` de la página permanece en `390`.

### Mapeo dato → persistencia

| Dato visible | Fuente real | Regla de lectura/presentación |
| --- | --- | --- |
| Razón social, nombre comercial y nombre de tienda | `src/db/schema.ts` → `companySettings.legalName`, `commercialName`, `tradeName` | Campos separados; no tratar nombre comercial como razón social. |
| RUC y validación | `companySettings.ruc`, `validationStatus` | Validar con la regla real de RUC/módulo 11 antes de guardar; mostrar mensaje de validación del servidor. |
| Dirección fiscal | `companySettings.country`, `department`, `province`, `district`, `address` | La ubicación se presenta compuesta, pero se persisten las columnas separadas. |
| Contacto | `companySettings.phones`, `phone`, `whatsapp`, `email`, `salesEmail` | No reemplazar correo de ventas por correo general; campos nulos se mantienen editables y honestos. |
| Horario y web | `companySettings.hours`, `businessHours`, `website` | Mostrar el campo configurado; si ambos horarios existen, el contrato decide cuál es operativo. |
| Branding | `companySettings.logoMediaId`, `faviconMediaId`, `primaryColor`, `secondaryColor` | Resolver media por ID y aplicar colores autorizados; no guardar colores desde la preview sin mutación. |
| Completitud de Empresa | campos requeridos no nulos de `companySettings` | El `6/9` es una métrica derivada del conjunto requerido; la implementación debe centralizar la definición. |
| Locales | `locations.id`, `code`, `name`, `type`, `active`, `address`, `city` | Conteo de locales activos; no confundir local con ubicación de inventario histórica. |
| Series y documentos | `documentSeries.code`, `label`, `documentType`, `prefix`, `nextNumber`, `padding`, `active` | `0` series se muestra como bloqueo operativo; las series se editan en su pestaña. |
| Precios e IGV | `companySettings.taxRate`, `taxMode` y contratos de precio/cotización | Si `taxRate` es nulo o `taxMode` no está configurado, mostrar advertencia y sugerencia 18% sin persistirla automáticamente. |
| Integraciones | `integrationConnections.key`, `label`, `category`, `lastCheckedStatus`, `lastCheckedAt`, `lastCheckedMessage`, `lastCheckedBy` | `NOT_CONFIGURED`, error y conexión se traducen a estado de negocio; `Probar integración` vive en Integraciones. |
| Historial y versionado | `companySettings.version`, `updatedBy`, `updatedAt`; `companySettingsHistory.settingsId`, `version`, `actorId`, `actorRole`, `before`, `after`, `validationStatus`, `createdAt` | Cada guardado exitoso crea una versión y registra actor, diff y fecha. Restaurar requiere confirmación y nueva versión. |
| Legal | `companySettings.legalLinks`, `legalPagesPublished` | No mostrar páginas legales como publicadas si el flag no lo confirma. |

## Estados y comportamiento que debe conservar la implementación

La lámina muestra el estado principal de cada superficie, pero el contrato de implementación debe incluir:

- **Carga:** skeleton con la geometría de la pantalla; no mostrar conteos `0` inventados.
- **Vacío:** mensaje contextual y acción. Ejemplos: árbol sin nodos, proveedor sin entregas (`Sin entregas registradas aún`), marca sin productos, configuración sin series.
- **Error:** alerta inline con `Reintentar`; no combinar error con métricas parciales presentadas como confirmadas.
- **Sin permiso:** ocultar mutaciones no autorizadas y explicar el permiso si el producto lo requiere.
- **Éxito:** confirmar después de que la transacción y la auditoría hayan persistido; devolver foco al control que inició la acción.
- **Destructivo:** desactivar categoría, archivar producto, cancelar OC o restaurar configuración requieren advertencia de impacto, confirmación y motivo según el endpoint.
- **Accesibilidad:** foco visible, nombres accesibles, teclado completo, encabezados semánticos en tablas, hitbox mínimo `44 × 44 px` en mobile, contraste AA y no depender sólo del color.
- **Responsive:** validar 1920, 1440, 1024 y 390; ninguna vista debe producir overflow horizontal o truncar una acción persistente.

## Captura reproducible

`lamina/render.cjs` abre `m10-lote2.html` como archivo local en Chromium headless, usa `deviceScaleFactor: 1`, locale `es-PE`, zona horaria `America/Lima`, espera `document.fonts.ready`, captura sin `fullPage` y lee el header PNG para comprobar dimensiones.

Las ocho vistas esperadas son:

- Desktop: `1920 × 1080`.
- Mobile: `390 × 844`.
- `window.devicePixelRatio = 1`.
- `document.documentElement.scrollWidth` igual al ancho de viewport.
- Cero errores de consola, errores de página o requests de assets fallidos.

Comando desde la raíz del repositorio:

```powershell
npm run render --prefix docs\goal\designs\m10-lote2\lamina
```

No se inicia ningún servidor de la aplicación; la lámina es autocontenida y consume sólo assets públicos existentes.
