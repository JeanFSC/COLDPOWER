# CP-026B — Informe de QA frontend

> Nota de vigencia: este informe documenta la etapa previa a la publicación del piloto editorial. Para la verificación posterior con productos reales, consultar `cp026b-catalog-pilot-2026-08-15.md` y `cp026b-pilot-visual-qa-2026-08-15.md`.

Fecha: 2026-08-15  
Alcance: rediseño UI/UX público ColdPower Commerce 2.0  
Regla aplicada: no se modificaron Neon, Drizzle, catálogo, productos, categorías, búsqueda, cotizaciones persistentes, inventario, autenticación ni RBAC.

## 1. Diagnóstico visual inicial

El ticket identificaba una experiencia demasiado técnica y cercana a un dashboard: header sobrecargado, hero institucional, exceso de cajas, catálogo con poca jerarquía de producto, cotización con lenguaje interno y responsive tratado como reducción de desktop.

La revisión actual confirma que el shell público ya usa una jerarquía comercial: buscador técnico protagonista, CTA naranja, navegación secundaria, superficies claras, tarjetas contenidas y footer navy compacto.

Durante esta revisión se corrigió además la selección de categorías de home: ya no se promocionan categorías con `0 referencias` y, cuando existen, se priorizan líneas técnicas como Refrigeración, Lavadoras, Aire acondicionado, Motores, Herramientas y Electrodomésticos.

## 2. Arquitectura encontrada

- Shell público compartido en `AppChrome`, `Header`, `TechnicalNav`, `MobileMenu`, `Footer` y `BrandLogo`.
- Home compuesta por `Hero`, categorías, productos, banners, búsqueda guiada, marcas, asistencia y beneficios.
- Catálogo server-side con filtros, búsqueda, paginación, empty state y drawer móvil.
- Producto preparado con galería, identidad técnica, compatibilidad, transacción y relaciones; en mobile incorpora una barra fija de acciones para agregar a cotización o abrir la solicitud sin perder el contexto del producto.
- Cotización con carrito persistente, formulario, resumen, estados de envío y confirmación; el CTA público principal usa “Solicitar cotización” y evita lenguaje administrativo como “Registrar solicitud”.
- Clerk como proveedor de autenticación; no se creó un segundo sistema de login.

## 3. Componentes reutilizados y nuevos

Reutilizados y ajustados: `Header`, `MobileMenu`, `Footer`, `BrandLogo`, `Button`, `SearchBar`, `Hero`, `CategoriesGrid`, `ProductSection`, `CatalogFilters`, `ProductCard`, `ProductGrid`, `ProductDetail`, `QuoteForm`, `QuoteSummary` y `CartQuotePanel`.

Componentes incorporados durante las fases del rediseño: `TechnicalNav`, `CategoryCard`, `AppliedFilters`, `MobileFilterDrawer`, `ProductGallery`, `TechnicalIdentity`, `CompatibilityPanel`, `TransactionBox`, `ProductAnchors`, `ApplicationSolutions`, `ComplementsSection`, `BrandsSection`, `AssistanceSection` y `TechnicalSearchGuide`.

## 4. Comparación conceptual

### Home

Antes: hero oscuro/institucional y bloques con exceso de explicación.  
Después: hero claro con título comercial, buscador técnico, CTAs y composición editorial de producto; debajo aparecen categorías y beneficios con prioridad visual comercial.

### Catálogo

Antes: el bloque introductorio y filtros competían con el listado.  
Después: encabezado breve, sidebar desktop, drawer mobile, filtros respaldados por datos y empty state compacto con acciones de recuperación.

### Producto

La estructura preparada separa galería, identidad técnica, disponibilidad, transacción, especificaciones y relacionados. En el entorno actual no existe una referencia publicada válida para demostrar una PDP real; la URL probada muestra un 404 honesto y no se fabricó un producto.

### Cotización

La experiencia actual se organiza como checkout asistido: resumen de productos a la izquierda, formulario agrupado a la derecha, CTA de solicitud y copy comercial sobre seguimiento de la solicitud.

## 5. Header y footer

- Header desktop: logo, buscador técnico, cuenta/acciones comerciales y navegación técnica secundaria.
- Header mobile: logo, carrito, menú y buscador en segunda línea; la taxonomía se mueve al drawer.
- Menú mobile y filtros de catálogo: solo promueven categorías, familias y marcas con referencias públicas; sin datos muestran recuperación hacia el catálogo.
- Soluciones por aplicación y complementos: sus enlaces ahora resuelven a búsqueda/estados explícitos; las relaciones no verificadas no simulan resultados.
- Guías de búsqueda: los modos `codigo`, `equipo` y `especificaciones` ahora se reflejan en el contexto visible de búsqueda o catálogo.
- Contacto: los motivos de ayuda, validación y asesoría técnica ahora conservan contexto visible al llegar desde la home o FAQ.
- Navegación técnica tablet: conserva todos los enlaces con scroll horizontal y añade una indicación visual de desplazamiento en anchos intermedios.
- TopBar: el contacto de WhatsApp ahora abre un enlace real cuando existe configuración válida.
- Footer: bloques compactos de marca, ayuda, categorías y contacto.
- Footer: las categorías ahora se filtran por referencias públicas; cuando el catálogo está vacío se muestra un único acceso a “Explorar catálogo”.
- Marcas: el inicio y la ruta `/catalogo?vista=marcas` filtran por referencias públicas; el estado vacío conserva un acceso claro al catálogo.
- Los claims de WhatsApp, horarios, pagos y cobertura se mantienen condicionados a configuración real.

## 6. Responsive comprobado

- Mobile 390 px: home, menú, catálogo, filtros, login, registro y cotización sin overflow horizontal.
- Menú mobile abierto a 390×844: diálogo a altura completa, sin overflow horizontal y cierre por Escape verificado.
- La ficha de producto reserva espacio inferior para la barra mobile y mantiene accesibles sus CTAs durante el scroll.
- Tablet/desktop de captura segura 1024 px: home, catálogo, cotización y 404 de producto.
- Desktop histórico del proyecto: home, catálogo, cotización, auth y menú mobile en `output/playwright/`.
- Capturas Playwright actuales: desktop 1440×1000 y mobile 390×844 para home, catálogo, cotización y estado 404 de producto; se conservaron como evidencia reproducible en `output/playwright/`.
- El capturador integrado limita algunas imágenes a 984 px aunque el viewport CSS sea 1024/1440; se documentó esa limitación y se usaron capturas que no recortan el contenido relevante.
- La captura `fullPage` a 1440 px repite horizontalmente el shell por una limitación del capturador; no se considera evidencia de aceptación.

## 7. Design tokens y accesibilidad

- Navy institucional, azul técnico, naranja para CTA, fondo gris frío y superficies blancas.
- IBM Plex Sans/Mono y jerarquía display/cuerpo/códigos.
- Radios moderados, sombras suaves y bordes reservados para controles.
- Labels visibles, headings semánticos, estados `loading/error/success`, focus visible y controles táctiles adecuados.
- Menú mobile con estado expandido y drawer; filtros mobile con acción de aplicar y cierre.
- Se mantiene `next/image`, `sizes`, prioridad solo en hero y slots de fallback para assets administrables.

## 8. Evidencia visual actual

### Escritorio / tablet

- [Home con composición editorial](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/09-home-desktop-capture-safe.png>)
- [Home con empty state compacto de categorías](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/29-home-category-priority.png>)
- [Catálogo](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/24-catalog-desktop.png>)
- [Cotización](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/22-quote-desktop.png>)
- [Login con proveedor social abajo](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/21-sign-in-social-bottom.png>)
- [Producto sin referencia publicada](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/25-product-empty-121.png>)

Capturas Playwright actuales (viewport, no `fullPage`):

- [Home desktop 1440](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-home-desktop-1440.png>)
- [Home desktop 1440 — fallback de asistencia sin canales configurados](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-home-desktop-assistance-fallback-1440.png>)
- [Home desktop 1440 — fallback de contacto en footer](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-home-desktop-footer-fallback-1440.png>)
- [Catálogo desktop 1440](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-catalog-desktop-1440.png>)
- [Cotización desktop 1440](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-quote-desktop-1440.png>)
- [Producto 404 desktop 1440](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-product-empty-desktop-1440.png>)

### Mobile

- [Home](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/10-home-mobile.png>)
- [Catálogo](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/11-catalog-mobile.png>)
- [Filtros abiertos](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/12-catalog-mobile-filter.png>)
- [Cotización](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/23-quote-mobile.png>)
- [Login](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/19-sign-in-mobile-top.png>)
- [Registro](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/docs/qa/visual-audit-2026-08-15/17-sign-up-mobile.png>)

Capturas Playwright actuales (390×844):

- [Home mobile](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-home-mobile-390.png>)
- [Home mobile — fallback de asistencia sin canales configurados](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-home-mobile-assistance-fallback-390.png>)
- [Home mobile — fallback de marcas](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-home-mobile-brands-fallback-390.png>)
- [Menú mobile abierto](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-mobile-menu-open-390.png>)
- [Catálogo mobile](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-catalog-mobile-390.png>)
- [Cotización mobile](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-quote-mobile-390.png>)
- [Producto 404 mobile](<C:/Users/JEAN/Desktop/Cold power/COLDPOWER/output/playwright/cp026b-product-empty-mobile-390.png>)

## 9. QA funcional ejecutado

- Navegación de home a catálogo mediante `Explorar catálogo`.
- Estado vacío del catálogo y acción de solicitar cotización.
- Apertura real del drawer de filtros.
- Rutas de login/registro y enlaces cruzados.
- Cotización sin productos y formulario visible.
- Estado 404 de producto inexistente.
- Verificación de overflow horizontal en mobile.
- Playwright: las vistas públicas desktop/mobile cargan sin errores de aplicación; el único error de red observado corresponde al 404 intencional de `/producto/121`.

## 10. Verificación automatizada

- `pnpm test:legacy-phases`: PASS.
- `pnpm test:all`: PASS; 67 pruebas Node principales y suites TypeScript sin fallos.
- Contratos específicos auth/hero: PASS.
- Contrato público CP-026B: 17 pruebas PASS, incluyendo estados vacíos, CTA de contacto del footer, estabilidad de hidratación del header y menú mobile a pantalla completa.
- Auditoría estática de CTAs públicos: sin `href="#"` y sin recortes del shell compartido.
- TypeScript: PASS.
- ESLint: 0 errores; quedan warnings preexistentes fuera del alcance frontend.
- `pnpm build`: PASS.
- Contrato PDP con CTA mobile persistente: PASS.
- Capturas Playwright: PASS visual para home, catálogo y cotización; el estado 404 de producto se muestra de forma honesta mientras no existan referencias públicas.

## 11. Regresiones corregidas

- Hero editorial recortado: se ajustó el encuadre responsive.
- Clerk desbordado dentro de la card principal: se eliminaron ancho, fondo, sombra y padding internos conflictivos.
- Proveedor social de Clerk: se ubicó debajo de la acción principal mediante la configuración soportada.
- Mobile sin navegación técnica horizontal ni overflow.
- Acción de cotización inaccesible tras desplazamiento en PDP mobile: se añadió barra fija responsive sin alterar el flujo desktop.
- CTA de cotización con lenguaje administrativo: se cambió a “Solicitar cotización” y se alinearon sus estados de envío y confirmación.
- Footer con categorías sin referencias públicas: se reemplazó la lista por el estado honesto “Explorar catálogo”.
- Acceso “Marcas” sin vista funcional y marcas sin referencias visibles: se añadió el directorio de marcas y su estado vacío respaldado por publicación.
- Facetas y menú mobile con opciones sin referencias públicas: se filtraron por `productCount > 0` y se agregó estado de recuperación.
- Enlaces de aplicación/relación sin lectura en catálogo: aplicación se traduce a búsqueda y relación muestra un estado editorial honesto hasta contar con respaldo.
- Enlace telefónico de asistencia que eliminaba la letra `s` en vez de espacios: corregido y protegido por contrato.
- Parámetros de modo ignorados por las páginas de búsqueda: ahora cambian título, descripción y/o contexto visible sin alterar la fuente de datos.
- Parámetros `motivo` ignorados por Contacto: ahora adaptan el título y la descripción de la atención solicitada.
- Navegación técnica recortada visualmente en tablet: se añadió una señal de scroll sin ocultar ni eliminar accesos.
- WhatsApp del TopBar visible pero no accionable: se conectó mediante `createWhatsAppLink` y mensaje inicial técnico.
- Asistencia sin teléfono/correo configurados: se cambió la tarjeta de “Canales disponibles” a un siguiente paso explícito con formulario, sin mostrar canales ficticios.
- Estado vacío de marcas en mobile: el enlace “Explorar catálogo” ahora ocupa su propia línea y conserva separación visual del mensaje.
- Footer sin datos de contacto: ahora muestra “Abrir formulario de contacto” en lugar de dejar la columna vacía.
- Hidratación del header con Clerk: el primer render de autenticación queda estable mediante `useSyncExternalStore`, evitando el cambio de atributos entre servidor y cliente.
- Menú mobile recortado por el shell sticky: se renderizó fuera del header con `backdrop-blur`; ahora ocupa los 390×844 px y se cierra correctamente con Escape.

## 12. Riesgos y pendientes honestos

- Verificación actual: `GET /api/catalog/products` responde HTTP 200 con `products: []`; el entorno no tiene productos publicados válidos. No es correcto fabricar una PDP o inventar stock/precio para la captura.
- Consola de las capturas: solo aparece el aviso esperado de Clerk por claves de desarrollo; el 404 de `/producto/121` es el recurso inexistente usado para verificar el estado vacío, no un fallo silencioso del frontend.
- El Libro de reclamaciones requiere definición legal, persistencia, seguimiento y responsable antes de habilitar envío.
- Términos y privacidad aún no tienen páginas legales dedicadas.
- La pantalla real de Clerk sigue su flujo seguro de varios pasos; el password aparece después de continuar con el identificador.
- Los proveedores sociales visibles dependen de la configuración de Clerk; el frontend no inventa Microsoft si no está habilitado.

## 13. Assets que debe proporcionar ColdPower

- Fotografías o renders de producto con SKU asociado.
- Logos de marcas autorizados para mostrar.
- Assets desktop/mobile para banners y categorías.
- Textos legales aprobados.
- Datos confirmados de empresa, pagos, cobertura, horarios y canales.

## 14. Siguiente ticket recomendado

Publicar y validar un lote pequeño de productos reales mediante el flujo editorial existente. Después repetir la matriz visual de PDP, cards con datos, categorías y cotización con líneas reales. En paralelo, definir con backend/legal las rutas de términos, privacidad y libro de reclamaciones.
