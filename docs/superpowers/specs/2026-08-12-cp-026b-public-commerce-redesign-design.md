# CP-026B — ColdPower Commerce 2.0: diseño del rediseño público

## Estado

Diseño aprobado por el usuario el 12 de agosto de 2026. Esta especificación precede al plan de implementación.

## Objetivo

Rediseñar la experiencia pública de ColdPower para que se perciba como un distribuidor técnico profesional y un ecommerce moderno de refrigeración, línea blanca y HVAC. Se conserva la lógica actual de catálogo, búsqueda, filtros, publicación, cotización, autenticación, RBAC, CMS y media; el cambio se concentra en jerarquía, composición, navegación, densidad, responsive y estados visuales.

## Diagnóstico actual

- El header tiene demasiadas acciones y enlaces compitiendo con el buscador.
- La navegación técnica es extensa y se siente más como una herramienta interna que como navegación comercial.
- El hero usa navy como superficie dominante y contiene demasiadas capas de contenido técnico.
- Las categorías se presentan como bloques oscuros repetitivos, sin imagen protagonista.
- Las cards de producto son funcionales, pero el contenido técnico y los CTA compiten dentro de una caja con demasiados bordes.
- `/catalogo` prioriza el formulario de filtros y no deja que el grid de productos domine la primera lectura.
- La ficha de producto separa galería, identidad y transacción en tres columnas estrechas; debe sentirse como una ficha ecommerce técnica de dos zonas principales.
- `/cotizacion` muestra un resumen navy grande y lenguaje interno como “Solicitud persistente”; debe parecer una experiencia de checkout asistido.
- El footer contiene más información visual de la necesaria y puede reducir su altura.
- La estructura pública ya cuenta con componentes reutilizables, datos persistentes y CMS/media; no se requiere reconstruir el dominio.

## Dirección visual aprobada

### Tesis visual

ColdPower se presenta como un mostrador técnico contemporáneo: superficies claras, tipografía firme, fotografía o slots de producto cuando exista un asset real, navy reservado para orientación y confianza, y naranja concentrado en las acciones comerciales.

### Sistema visual

- Navy institucional: header, footer, hero y bloques premium puntuales; no como fondo de todas las cards.
- Azul ColdPower: enlaces, foco, estados técnicos y navegación secundaria.
- Naranja: CTA principal, promoción y acentos de alta prioridad; no subtítulos decorativos.
- Fondo de página gris frío muy claro; cards blancas solo donde exista una acción o agrupación útil.
- Se conserva IBM Plex Sans/Mono para evitar rebranding: Sans para display y cuerpo; Mono para SKU, códigos y valores técnicos.
- Radios moderados de 10–16 px; sombras suaves; bordes solo para delimitar controles, no cada sección.
- El layout usa un contenedor público común de aproximadamente 1320 px, gutters consistentes y una escala de spacing compartida.

### Copy público

- Usar lenguaje comercial: “Tu solicitud quedará registrada para que nuestro equipo pueda darle seguimiento”.
- Eliminar de la UI pública referencias a persistencia, runtime, fuente, V1, inventario interno o validación de infraestructura.
- Mantener advertencias honestas: precio, stock, cobertura, compatibilidad, WhatsApp, medios de pago y distribución oficial solo aparecen cuando la fuente/configuración los respalda.
- No inventar nombres, categorías, marcas, beneficios, descuentos, precio, stock o fotografías.

## Arquitectura de experiencia

### Shell público

`RootLayout` seguirá resolviendo categorías para el shell y mantendrá `CartProvider`, `CompareProvider`, Clerk, banner de preview, footer, WhatsApp y comparador. Se reorganizarán visualmente `TopBar`, `Header`, `TechnicalNav`, `MobileMenu` y `Footer` sin cambiar sus contratos de negocio.

Header desktop:

1. Topbar opcional, solo con claims configurados.
2. Fila principal: logo, buscador grande, cuenta y cotización/carrito.
3. Fila comercial: “Todas las categorías” y un conjunto corto de accesos respaldados por la taxonomía actual.

Header móvil:

- menú, logo, buscar, cuenta y cotización/carrito en una fila compacta;
- buscador en segunda línea si el ancho lo requiere;
- enlaces desktop dentro de un drawer accesible;
- no mostrar toda la taxonomía como barra horizontal permanente.

### Home

Orden público:

1. Header.
2. Hero comercial full-bleed, con copy corto, buscador protagonista, explorar catálogo y cotización.
3. Categorías visuales con imagen o fallback administrable, nombre y conteo real.
4. Productos destacados/para comenzar mediante `ProductGrid`/`ProductSection` reutilizable.
5. Banner promocional o editorial solo si existe contenido válido publicado.
6. Secciones por línea o aplicación únicamente cuando la categoría/familia exista realmente.
7. Banners dobles administrables sin inventar claims.
8. Marcas presentes en el catálogo, sin afirmar distribución oficial.
9. Ayuda para identificar repuesto y futura carga de foto como affordance honesta.
10. Máximo cuatro beneficios con claims configurados.
11. Footer compacto.

El hero usa el slot visual existente cuando no haya fotografía real. El slot debe soportar en el futuro asset desktop, asset móvil, alt text y fallback CMS; no se asociarán imágenes arbitrarias a productos.

### Catálogo y categorías

- Encabezado corto con “Catálogo”, conteo real y buscador.
- Breadcrumb, chips de filtros activos y acción para limpiar.
- Desktop: sidebar de aproximadamente 25% y resultados de 75%; sidebar sticky solo en desktop.
- Resultados en 3/4 columnas según ancho útil.
- Mobile: botón “Filtros” abre drawer/bottom sheet con foco administrado y cierre por escape.
- Solo se muestran filtros con respaldo en el view model: categoría, familia, marca, disponibilidad y facets técnicos existentes.
- El grid aparece inmediatamente después del encabezado; el empty state es compacto, con limpiar filtros y solicitar ayuda.
- Paginación, búsqueda server-side, ordenamiento y URLs existentes se preservan.

Las páginas `/categoria/[slug]` y `/marca/[slug]` reutilizan la misma jerarquía de catálogo con un contexto breve específico y no duplican lógicas de consulta.

### ProductCard y ProductGrid

`ProductCard` será el componente visual estándar de home, catálogo, categoría, marca y relacionados.

Contenido en orden:

1. Imagen/fallback visual consistente, con `alt` correcto.
2. Marca o familia discreta cuando exista.
3. Nombre.
4. SKU en mono.
5. Hasta tres especificaciones con valor real.
6. Disponibilidad solo según el estado del producto.
7. Precio únicamente si existe.
8. CTA “Solicitar cotización”/“Agregar a cotización” y enlace a ficha.

El tratamiento elimina badges innecesarios y bordes repetidos. Las imágenes de categoría se etiquetan como referenciales cuando corresponda. El comparador continúa funcionando como affordance secundaria.

### Ficha de producto

- Breadcrumb y anclas simples.
- Desktop: dos zonas principales, galería aproximadamente 50% e información aproximadamente 50%; CTA visible sin convertir la pantalla en un dashboard.
- Galería preparada para imagen principal, miniaturas y fallback.
- Información: nombre, SKU, marca, categoría/familia, atributos relevantes, disponibilidad respaldada, precio si existe, CTA de cotización y CTA secundario.
- En mobile: imagen, identidad, especificaciones, CTA; barra sticky opcional sin tapar contenido ni controles.
- Descripción, especificaciones, aplicación e información adicional solo se renderizan cuando tienen datos.
- Relaciones explícitas se muestran como “Productos relacionados”; sugerencias por familia se etiquetan como relacionadas, nunca como compatibles.
- WhatsApp solo aparece si la configuración contiene un número real.

### Cotización

- Layout desktop equilibrado: formulario 60–65%, resumen 35–40%.
- Resumen claro visualmente, con imagen, nombre, SKU, cantidad y acciones de modificar/eliminar cuando existan líneas en el carrito.
- Sin producto: título “¿Qué repuesto necesitas?”, búsqueda, descripción, marca/modelo y placeholder de futura foto; no una gran card vacía.
- Formulario agrupado en datos básicos, ubicación y solicitud.
- CTA primario “Solicitar cotización”; WhatsApp secundario solo configurado.
- Se elimina lenguaje interno sobre persistencia y se conserva la llamada API/transacción existente.
- Estados de envío, error y éxito ocupan el espacio del formulario sin romper el resumen.

### Páginas institucionales y estados públicos

`/nosotros`, `/contacto`, `/faq`, `/libro-de-reclamaciones`, 404, catálogo no disponible, producto no disponible y estados vacíos/error comparten el mismo sistema de superficies y CTA. Deben verse como páginas públicas de ColdPower, no como pantallas del panel administrativo.

## Componentes y límites

### Componentes reutilizados y ajustados

- `Header`, `TopBar`, `TechnicalNav`, `MobileMenu`.
- `Footer`, `BrandLogo`, `Button`, `Badge`, `SectionTitle`, `EmptyState`.
- `Hero`, `CategoriesGrid`, `ProductSection`, `PromoBanner`, `BrandsSection`, `AssistanceSection`, `BenefitsBar`.
- `CatalogFilters`, `AppliedFilters`, `CatalogPagination`, `ProductGrid`, `ProductCard`.
- `ProductGallery`, `TechnicalIdentity`, `CompatibilityPanel`, `TransactionBox`, `ProductDetail`.
- `QuoteForm`, `QuoteSummary`, `CartQuotePanel`, `QuoteSuccess`.

### Componentes nuevos o extraídos cuando sean necesarios

- `SearchBar` compartido con variantes header/hero/catalog.
- `CategoryCard` visual con fallback de imagen.
- `PromoBanner`/`BannerPair` con props de contenido administrable.
- `MobileFilterDrawer` accesible.
- `ProductMedia` o slot equivalente para fallback y assets CMS.
- `QuoteLineItem` para resumen de múltiples productos.
- `PublicPageHeader`/`Breadcrumb` si reduce duplicación entre catálogo, categorías, marcas y detalle.

Cada componente nuevo tendrá una responsabilidad única y recibirá datos ya resueltos por repositorios/view models existentes. No se crearán arrays de productos, categorías o marcas como fuente runtime.

## CMS, media y contenido administrable

- Se reutilizan `loadPublishedCms`, `PublishedCmsBlocks`, `cms-repository`, `media-repository` y los estados publicados existentes.
- Un bloque no publicado o inválido no reemplaza el fallback visual válido.
- Los componentes aceptan `image`, `mobileImage`, `altText`, `title`, `subtitle`, `ctaLabel`, `ctaHref`, `order` y estado cuando el payload publicado lo permita.
- Las imágenes de productos deben provenir de media activa asociada o del placeholder; no se descargan imágenes externas ni se inventan fotos.
- El rediseño no implementa un CMS nuevo ni una Media Library nueva.

## Responsive y accesibilidad

- Breakpoints consistentes para móvil, tablet aproximada de 768/1024 px y desktop de 1440 px.
- No se resuelve mobile con simple escalado: se reordenan header, filtros, cards, galería, formulario y CTA.
- Touch targets de al menos 44 px en controles principales.
- Semántica: `header`, `nav`, `main`, `section`, `footer`, headings en orden, labels visibles o sr-only correctos.
- Menú y drawer con `aria-expanded`, `aria-controls`, foco visible, cierre por Escape y retorno de foco.
- Imágenes con `alt`; decorativas con alt vacío.
- Estados hover/focus/disabled/loading/error/success coherentes y legibles.
- Contraste WCAG AA para texto y CTA, incluido naranja sobre superficies claras/oscuras.
- Respeto a `prefers-reduced-motion`.

## Performance

- Usar `next/image` donde ya exista soporte, con `sizes`, `priority` solo para el hero y lazy loading para contenido bajo el primer viewport.
- Mantener los assets SVG/placeholder existentes y dejar slots listos para WebP/AVIF sin introducir dependencias de almacenamiento.
- Evitar layout shift reservando proporciones de imagen.
- No introducir una librería de animación si CSS y transiciones existentes cubren la interacción; las animaciones serán breves y reducidas por preferencia del usuario.
- Mantener consultas y paginación server-side; el rediseño no cambia el acceso a Neon/Drizzle.

## QA y evidencia de aceptación

### Capturas obligatorias

Con Playwright existente o configuración mínima:

- Desktop 1440: home, catálogo, producto, cotización.
- Tablet 768/1024: home, catálogo, producto.
- Mobile 390: home, menú, catálogo, filtros abiertos, producto, cotización.

Las capturas se guardan bajo `tmp/qa-cp026b/` y se inspeccionan visualmente; no basta con que compile.

### QA funcional

Probar búsqueda, filtros, chips/limpiar, paginación, categoría, marca, ficha, agregar/quitar/modificar cotización, envío de cotización, seguimiento, navegación de header y footer. Verificar que el drawer móvil no modifica la URL hasta aplicar filtros y que el CTA mantiene los identificadores existentes.

### QA técnico

Ejecutar los tests del proyecto relacionados con catálogo/cotización/CMS, `corepack pnpm exec tsc --noEmit`, `corepack pnpm lint`, `corepack pnpm build` y smoke tests de rutas. Revisar consola del navegador, hidratación, imágenes rotas, enlaces muertos, overflow horizontal, layout shift y warnings React importantes.

## Fuera de alcance

- Neon, Drizzle, migraciones de dominio y datos maestros.
- Catálogo, inventario, Kardex, búsqueda server-side, autenticación, RBAC y lógica editorial.
- CRM, pagos, checkout real, SUNAT, proveedores, compras, facturación y WhatsApp Business API.
- CMS completo, Media Library completa, precios reales y carga masiva de precios.
- Rediseño completo del Admin.

## Criterios de aceptación

El rediseño se acepta cuando:

1. La home, catálogo, producto y cotización se leen como ecommerce técnico público y no como dashboard/formulario interno.
2. La búsqueda y el producto son visualmente dominantes.
3. El header y footer tienen una jerarquía comercial clara y el footer es sensiblemente más compacto.
4. El catálogo funciona con sidebar desktop y drawer móvil sin regresiones de consulta.
5. La ficha y cotización presentan información real sin inventar claims ni valores.
6. Las páginas públicas obligatorias y estados vacíos/error comparten el nuevo sistema visual.
7. Los slots de imagen y banners quedan preparados para CMS/media existente.
8. Las capturas desktop, tablet y mobile muestran ausencia de overflow, layouts rotos o CTAs falsos.
9. Tests, typecheck, lint y build pasan; el flujo funcional de catálogo/cotización permanece operativo.

## Riesgos y decisiones pendientes

- No hay garantía de fotografía de producto real; se entregarán slots y placeholders hasta que ColdPower proporcione assets.
- Las categorías destacadas deberán seguir derivándose de categorías/familias reales mientras no exista configuración editorial específica.
- La visibilidad de WhatsApp, pagos, horarios, teléfonos y claims depende de `company_settings`/configuración real.
- El working tree ya contiene cambios de otras fases; el desarrollo debe limitar cada commit a archivos del rediseño y no revertir trabajo previo.
