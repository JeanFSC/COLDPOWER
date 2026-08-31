# Reconversión Catalog-First de COLDPOWER — Plan de Implementación

> **Para agentes de ejecución:** usar una ejecución por tareas con checkpoints, pruebas primero y revisión antes de avanzar a la siguiente fase.

**Objetivo:** convertir COLDPOWER en una plataforma B2B de abastecimiento técnico basada en catálogo, búsqueda por códigos y especificaciones, validación de compatibilidad, comparación y cotización asistida trazable.

**Arquitectura:** conservar Next.js App Router, TypeScript y los datos actuales como fuente temporal, pero separar la lógica de publicación, búsqueda, filtros, compatibilidad y cotización en módulos pequeños. La homepage será catalog-first; la información institucional quedará después del catálogo. El logo oficial se servirá desde `public/brand/logo-coldpower.png` y no se modificará el original.

**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, `lucide-react`, `next/image`, Drizzle/Neon ya presentes, Clerk opcional y Playwright o scripts Node existentes para verificación.

## Restricciones globales

- No publicar indiscriminadamente los 1,359 registros; solo productos que pasen compuertas editoriales.
- No mostrar imágenes rotas, espacios vacíos, `S/ 0.00`, stock ficticio ni temporizadores.
- No confundir alternativa, compatible y complemento.
- No exigir registro para crear una cotización ni depender exclusivamente de WhatsApp.
- No ocultar SKU, MPN, disponibilidad o fecha de actualización.
- No indexar fichas incompletas ni incluirlas en sitemap.
- La homepage tendrá como máximo nueve bloques de contenido y no colocará institucional antes del catálogo.
- El CTA ámbar `#F59E0B` se reservará para la acción comercial principal; títulos, decoración y estados informativos usarán azul o verde según corresponda.
- Paleta: `#0B2239`, `#0F6FAE`, `#F59E0B`, `#E68A00`, `#CC7400`, `#F4F7F9`, `#FFFFFF`, `#D7E0E7`, `#667085`, `#137A4B`, `#A15C00`, `#B42318`.
- Tipografía de interfaz: IBM Plex Sans o fallback Arial/Helvetica; códigos y valores técnicos: IBM Plex Mono.
- Objetivos visuales: controles de 44 px mínimo, focus visible de 2–3 px, contraste mínimo 4.5:1 para texto normal y 3:1 para controles relevantes, `prefers-reduced-motion` respetado.
- El logo oficial es el asset existente `img/LOGO COLDPOWER.png` (1254 × 1254 px); se copiará a `public/brand/logo-coldpower.png` sin editarlo.

---

### Tarea 1: Auditoría y contrato de publicación

**Archivos:**
- Crear: `src/types/catalog.ts`
- Crear: `src/lib/publication.ts`
- Crear: `scripts/phase15-catalog-contract.test.mjs`
- Revisar sin reemplazar: `src/types/product.ts`, `src/data/products.ts`, `src/lib/catalog.ts`

**Resultado:** una función determinista que clasifique cada producto como `imported`, `enrichment`, `assisted-discovery`, `publishable`, `published`, `suspended` o `archived`, y que permita obtener solo productos públicos válidos.

- [ ] Escribir una prueba roja para que un producto sin SKU, marca, tres atributos y estado comercial no sea público, y que un producto válido sí pueda publicarse.
- [ ] Ejecutar `node scripts/phase15-catalog-contract.test.mjs`; debe fallar porque aún no existen el contrato y el helper.
- [ ] Implementar los tipos, compuertas y la puntuación 0–100 con los pesos de la especificación: identidad 20, clasificación 15, técnicos 25, comercial 15, imágenes 15, documentos 5 y SEO 5.
- [ ] Ejecutar la misma prueba; debe pasar y reportar la cantidad actual de registros por estado sin asumir que todos son publicables.

### Tarea 2: Sistema visual, logo y navegación técnica

**Archivos:**
- Copiar: `img/LOGO COLDPOWER.png` → `public/brand/logo-coldpower.png`
- Modificar: `src/app/globals.css`, `src/app/layout.tsx`
- Modificar: `src/components/shared/BrandLogo.tsx`
- Modificar: `src/components/layout/TopBar.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/MobileMenu.tsx`, `src/components/layout/Footer.tsx`
- Crear: `src/components/layout/TechnicalNav.tsx`
- Crear: `scripts/phase16-navigation-design.test.mjs`

**Resultado:** barra utilitaria compactable, encabezado con buscador dominante y cotización visible, navegación técnica con categorías, logo real y tokens de diseño B2B.

- [ ] Escribir pruebas que verifiquen el logo público, los tokens exactos, el placeholder técnico del buscador y que `Refrigeración`/`Lavadoras` no sean enlaces principales heredados del menú anterior; las categorías sí deben seguir accesibles desde catálogo.
- [ ] Ejecutar la prueba en rojo.
- [ ] Implementar tokens, IBM Plex Sans/Mono con fallback seguro, logo real, focus visible y navegación técnica sin carrusel ni animación obligatoria.
- [ ] Ejecutar `pnpm lint` y `node scripts/phase16-navigation-design.test.mjs`.

### Tarea 3: Homepage catalog-first

**Archivos:**
- Modificar: `src/app/page.tsx`
- Modificar o reemplazar por unidades pequeñas: `src/components/home/Hero.tsx`, `CategoriesGrid.tsx`, `ProductSection.tsx`, `PromoBanner.tsx`, `BenefitsBar.tsx`
- Crear: `src/components/home/TechnicalSearchGuide.tsx`, `ApplicationSolutions.tsx`, `ComplementsSection.tsx`, `BrandsSection.tsx`, `AssistanceSection.tsx`
- Crear: `scripts/phase17-home-catalog-first.test.mjs`

**Resultado:** máximo nueve bloques, en este orden: acceso comercial, familias, productos prioritarios, buscador guiado, soluciones por aplicación, kits/complementos, marcas, confianza/entrega/soporte y asistencia final. El bloque de catálogo aparece antes de la información institucional. FAQ y Confianza de la petición anterior vivirán en `/faq`, no duplicados en inicio.

- [ ] Escribir pruebas estructurales para el orden de los bloques, ausencia de `S/ 0.00`, máximo ocho productos prioritarios, CTA `Agregar a cotización` y presencia del logo/hero sin banner de 600 px.
- [ ] Ejecutar en rojo.
- [ ] Implementar usando solo productos devueltos por `getPublishedProducts()` y categorías seleccionadas; mostrar hasta 8 familias prioritarias y hasta 8 productos publicados.
- [ ] Verificar `/` con el servidor local, `pnpm lint` y la prueba de homepage.

### Tarea 4: Tarjeta técnica y catálogo facetado

**Archivos:**
- Modificar: `src/lib/catalog.ts`, `src/components/catalog/ProductCard.tsx`, `ProductGrid.tsx`, `CatalogFilters.tsx`, `SearchResults.tsx`
- Modificar: `src/app/catalogo/page.tsx`, `src/app/categoria/[slug]/page.tsx`
- Crear: `src/components/catalog/AppliedFilters.tsx`, `src/components/catalog/CompareBar.tsx`, `src/components/catalog/ComparePanel.tsx`
- Crear: `scripts/phase18-catalog-facets.test.mjs`

**Resultado:** búsqueda por SKU/MPN/OEM/modelo, normalización de guiones/tildes/unidades, filtros URL con OR dentro de faceta y AND entre facetas, orden por relevancia técnica, tarjetas con marca/SKU/MPN/estado/tres atributos y comparador máximo de cuatro.

- [ ] Escribir pruebas rojas para coincidencia exacta por SKU, filtros preservados en URL, conteo, chips removibles, no mostrar productos no públicos y límite de cuatro comparados.
- [ ] Implementar la lógica pura primero; después conectar los controles server/client sin recarga completa.
- [ ] Verificar rutas `/catalogo`, `/categoria/refrigeracion` y una URL filtrada con `pnpm lint`, pruebas de fase y servidor local.

### Tarea 5: Ficha de producto técnica y compatibilidad

**Archivos:**
- Modificar: `src/components/product/ProductDetail.tsx`, `src/app/producto/[slug]/page.tsx`
- Crear: `src/components/product/ProductGallery.tsx`, `TechnicalIdentity.tsx`, `CompatibilityPanel.tsx`, `TransactionBox.tsx`, `ProductAnchors.tsx`
- Crear: `src/lib/compatibility.ts`
- Crear: `scripts/phase19-product-detail.test.mjs`

**Resultado:** PDP de tres columnas en escritorio, dos en tablet y orden móvil especificado; galería accesible, documentos con nombre/fecha/tamaño, seis atributos críticos, códigos copiables, variantes por SKU y caja sticky con precio/stock/entrega/cantidad/agregar/WhatsApp/validación.

- [ ] Escribir pruebas rojas para `S/ 0.00`, orden de niveles, estados de compatibilidad, cantidad, CTA y `noindex` para ficha incompleta.
- [ ] Implementar compatibilidad como estados explícitos: confirmada, por especificaciones, validación requerida y no compatible.
- [ ] Verificar PDP publicada y ficha asistida por URL exacta; ejecutar lint, fase y pruebas de navegación.

### Tarea 6: Cotización trazable y eventos de conversión

**Archivos:**
- Modificar: `src/components/cart/CartProvider.tsx`, `CartButton.tsx`, `CartQuotePanel.tsx`, `src/app/cotizacion/page.tsx`, `src/components/quote/QuoteForm.tsx`, `src/lib/quote.ts`, `src/app/api/cotizacion/route.ts`
- Crear: `src/lib/analytics.ts`, `src/components/shared/QuoteProgress.tsx`
- Crear: `scripts/phase20-quote-traceability.test.mjs`

**Resultado:** flujo `1. Productos / 2. Datos / 3. Confirmación`, acceso sin registro, cantidades y observaciones, ID `CPQ-YYYY-NNNNNN`, almacenamiento de solicitud y WhatsApp con ID/URL/SKU/cantidad sin depender de texto gigante.

- [ ] Escribir pruebas rojas para ID, validación, rate limit, evento `quote_item_added`, `quote_started`, `quote_submitted` y confirmación.
- [ ] Implementar eventos como helper seguro que no rompa desarrollo si no hay proveedor analítico.
- [ ] Verificar POST real de API, estado de éxito, panel admin existente y flujo sin Clerk configurado.

### Tarea 7: Administración de hidratación y permisos

**Archivos:**
- Modificar: `src/db/schema.ts`, `src/app/admin/page.tsx`, `src/app/admin/cotizaciones/page.tsx`, `src/lib/roles.ts`, `src/proxy.ts`
- Crear: `src/app/admin/catalogo/page.tsx`, `src/app/admin/catalogo/[id]/page.tsx`
- Crear: `src/components/admin/CatalogHealthDashboard.tsx`, `CatalogQueue.tsx`, `CatalogEditor.tsx`, `BulkImportPanel.tsx`
- Crear: `scripts/phase21-catalog-admin.test.mjs`

**Resultado:** dashboard con importados/publicados/faltantes, cola por filtros de calidad, editor por nueve grupos, operaciones masivas declaradas y separación entre editar/publicar con auditoría y roles: superadministrador, gestor, revisor técnico, comercial y usuario final.

- [ ] Escribir pruebas rojas para guards de rol, prohibición de autoasignación administrativa y compuerta de publicación.
- [ ] Implementar primero los guards y contratos; después las vistas con datos vacíos honestos, sin inventar métricas comerciales.
- [ ] Verificar rutas admin con y sin autenticación configurada y ejecutar regresión de RBAC.

### Tarea 8: SEO, indexación, imágenes y rendimiento

**Archivos:**
- Modificar: `src/app/robots.ts`, `src/app/sitemap.ts`, metadatos de `page.tsx`, catálogo y PDP
- Crear: `src/lib/seo.ts`, `src/components/shared/CategoryImageFallback.tsx`
- Modificar: `src/components/catalog/ProductCard.tsx` y galería para reservar dimensiones y etiquetar representación de categoría
- Crear: `scripts/phase22-seo-performance.test.mjs`

**Resultado:** solo publicados en sitemap/indexación, canonical consistente, JSON-LD coherente con contenido visible, fallback profesional por familia y carga de imágenes con dimensiones, lazy loading bajo el primer pantallazo.

- [ ] Escribir pruebas rojas para robots/sitemap/noindex y prohibición de imagen rota o `No image`.
- [ ] Implementar la capa SEO y fallback con SVG/CSS propio; no usar fotos de terceros ni presentar una imagen de familia como producto real.
- [ ] Verificar build, sitemap, robots y respuestas HTML de `/`, `/catalogo` y una PDP.

### Tarea 9: FAQ, contacto y cierre de navegación

**Archivos:**
- Crear: `src/app/faq/page.tsx`
- Modificar: `src/components/home/FAQ.tsx`, `Testimonials.tsx`, `src/app/page.tsx`
- Modificar: `Header.tsx`, `MobileMenu.tsx`, `Footer.tsx`
- Crear: `scripts/phase23-faq-navigation.test.mjs`

**Resultado:** `/faq` muestra primero confianza/testimonios y luego preguntas; inicio no duplica esos bloques; FAQ está visible en navegación y no aparecen Refrigeración/Lavadoras como enlaces principales del menú.

- [ ] Escribir prueba roja de orden y navegación.
- [ ] Implementar y verificar `/faq`, móvil/escritorio y enlaces del footer.

### Tarea 10: QA full test de aceptación

**Archivos:**
- Crear: `scripts/phase24-full-qa.test.mjs`
- Crear: `docs/qa/catalog-first-qa-report.md`

**Resultado:** auditoría final contra cada requisito explícito de esta biblia.

- [ ] Ejecutar `pnpm lint`.
- [ ] Ejecutar `pnpm test:all` y todas las fases 15–23.
- [ ] Ejecutar `pnpm build`.
- [ ] Levantar localhost y probar HTTP 200 para `/`, `/catalogo`, `/buscar`, `/cotizacion`, `/faq`, `/nosotros`, `/contacto`, `/robots.txt`, `/sitemap.xml`, una categoría y una PDP.
- [ ] Probar responsive en 375, 768, 1024 y 1440 px con Playwright si está disponible; revisar menú, filtros, comparador, PDP sticky y barra móvil.
- [ ] Comprobar ausencia de `S/ 0.00`, “No image”, imágenes rotas, stock falso, duplicación FAQ/confianza y CTA ámbar decorativo.
- [ ] Registrar resultados reales, fallas y pendientes honestos en el informe; no declarar completitud si una prueba crítica queda sin evidencia.

## Checkpoints de ejecución

1. Después de Tareas 1–3: homepage y navegación catalog-first funcionan sin romper rutas existentes.
2. Después de Tareas 4–5: catálogo, filtros, comparador y PDP cumplen contrato técnico.
3. Después de Tareas 6–7: cotización trazable y administración respetan permisos.
4. Después de Tareas 8–9: SEO, assets, FAQ y navegación quedan consistentes.
5. Tarea 10: solo aquí se audita y se decide si el objetivo puede marcarse como completo.
