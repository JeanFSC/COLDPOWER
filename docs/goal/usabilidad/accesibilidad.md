# Accesibilidad — QA final local

Fecha: 2026-09-24  
Herramienta: axe-core inyectado con Playwright sobre el build servido en `3003`.  
Viewports principales: 1920×1080 y 390×844. Base local: PostgreSQL 18 en `5433` con `.env.localdb`.

## Resultado axe: antes y después

`violations` cuenta reglas axe con fallo; `incomplete` son revisiones que requieren juicio humano y no se convierten en fallos automáticos.

| Superficie | Línea base | Final | Resultado |
|---|---:|---:|---|
| Home | 1 violación / 1 incompleta | 0 / 2 incompletas | ✅ [`axe-final-home-final.json`](../../output/qa-final-local/axe-final-home-final.json) |
| Catálogo | 2 / 1 | 0 / 1 | ✅ [`axe-final-catalogo-final.json`](../../output/qa-final-local/axe-final-catalogo-final.json) |
| Ficha de producto | 1 / 2 | 0 / 1 | ✅ [`axe-final-producto-final.json`](../../output/qa-final-local/axe-final-producto-final.json) |
| Admin inicio | 5 / 1 | 0 / 0 | ✅ [`axe-admin-inicio-final-2.json`](../../output/qa-final-local/axe-admin-inicio-final-2.json) |
| Admin pagos | 5 / 1 | 0 / 1 | ✅ [`axe-admin-pagos-final-2.json`](../../output/qa-final-local/axe-admin-pagos-final-2.json) |
| Admin inventario | 4 / 1 | 0 / 1 | ✅ [`axe-admin-inventario-final-2.json`](../../output/qa-final-local/axe-admin-inventario-final-2.json) |
| Admin cotizaciones | 5 / 1 | 0 / 1 | ✅ [`axe-admin-cotizaciones-final-2.json`](../../output/qa-final-local/axe-admin-cotizaciones-final-2.json) |
| Admin configuración | 5 / 1 | 0 / 1 | ✅ [`axe-admin-configuracion-final-2.json`](../../output/qa-final-local/axe-admin-configuracion-final-2.json) |

La columna final refleja la última corrida después de los ajustes de contraste, semántica y nombres accesibles. No se presenta como auditoría WCAG completa: carrito, contacto, cotización y todos los módulos admin no tuvieron una corrida final axe equivalente.

## Correcciones aplicadas

- Botones primarios con texto blanco y contraste suficiente en [`Button.tsx`](../../src/components/shared/Button.tsx:1), [`SearchBar.tsx`](../../src/components/shared/SearchBar.tsx:1), [`AuthPreviewForm.tsx`](../../src/components/auth/AuthPreviewForm.tsx:1) y [`ComplaintsForm.tsx`](../../src/components/complaints/ComplaintsForm.tsx:90).
- Colores públicos y home ajustados para contraste AA en [`globals.css`](../../src/app/globals.css:1); marca ColdPower ajustada en [`BrandsSection.tsx`](../../src/components/home/BrandsSection.tsx:5).
- Footer y enlaces públicos reparados en [`Footer.tsx`](../../src/components/layout/Footer.tsx:37); navegación de sitemap ya no produce 404.
- Región etiquetada en [`TopBar.tsx`](../../src/components/layout/TopBar.tsx:1), paginación disabled con `aria-disabled` en [`CatalogPagination.tsx`](../../src/components/catalog/CatalogPagination.tsx:1), y gráficos vacíos con rol descriptivo en [`AdminCharts.tsx`](../../src/components/admin/AdminCharts.tsx:1).
- Tabla, paginación, aside, acciones y estructura semántica corregidos en [`QuotesWorkspace.tsx`](../../src/components/admin/QuotesWorkspace.tsx:1); encabezados de acción y estados vacíos corregidos en [`InventoryAdminWorkspace.tsx`](../../src/components/admin/InventoryAdminWorkspace.tsx:1).
- Badge de advertencia y colores administrativos de bajo contraste corregidos en [`Badge.tsx`](../../src/components/shared/Badge.tsx:1), [`AdminShell.tsx`](../../src/components/admin/AdminShell.tsx:1), [`PaymentsControlCenter.tsx`](../../src/components/admin/PaymentsControlCenter.tsx:1), [`CompanySettingsHistoryPanel.tsx`](../../src/components/admin/CompanySettingsHistoryPanel.tsx:1) y [`DocumentSeriesManager.tsx`](../../src/components/admin/DocumentSeriesManager.tsx:1).

## Pruebas manuales

- Se revisaron foco, labels, `aria-label`, estados disabled, tablas vacías, navegación principal, formularios de cotización/reclamos y CTA móvil en las rutas probadas.
- No se detectaron overflow de página en móvil; la navegación horizontal de categorías conserva `scrollWidth` mayor que el viewport como patrón intencional. Queda como riesgo P2 para teclado/descubribilidad en móvil.
- Consola pública final: sin errores en home, catálogo y ficha. El flujo de cliente registra 403 intencionales solo en probes de autorización admin; no se clasifican como error de accesibilidad.
- No se ejecutó una pasada completa con lector de pantalla, `prefers-reduced-motion`, 3G simulado, 768/1024/1440 ni todas las rutas profundas.

## Pendientes

- Repetir axe en carrito, contacto, cotización y cada módulo admin después de completar sus mutaciones.
- Revisar con teclado la navegación horizontal de categorías y sus estados de foco.
- Ejecutar lector de pantalla y prueba de zoom/reflow antes del cierre WCAG formal.

## Veredicto

Las superficies auditadas quedan sin violaciones axe automáticas en la corrida final. El cierre de accesibilidad del producto completo sigue condicionado a las rutas no re-auditadas y a las pruebas manuales pendientes.
