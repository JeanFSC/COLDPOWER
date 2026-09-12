# QA — CP-032 dashboard redesign

Fecha: 2026-08-31  
Rama: `main`  
Commit de referencia: `df60352`  
Entorno visual: `http://localhost:3001` en Brave con sesión administrativa activa

## Alcance validado

- Dashboard ejecutivo con cuatro KPIs principales.
- Evolución de ventas responsive en SVG, con una geometría compartida para trazo, puntos, etiquetas y tooltips.
- Pipeline agrupado por macroetapas, con conteos, porcentajes, etapas incluidas, importe y enlaces de detalle.
- Productos más vendidos con unidades, ingresos y tendencia diaria de ingresos confirmados.
- Acciones pendientes como única fuente visible, sin un segundo panel modal que repita la misma información.
- Actividad reciente deduplicada cuando los eventos son indistinguibles.
- Filtros avanzados con borrador local, aplicación explícita, limpieza, dependencias categoría–familia, rango personalizado y exportación con la misma query.
- Selector de granularidad compacto y responsive, sin depender del render nativo recortado del navegador.
- Drawer de filtros adaptado a escritorio y móvil: panel lateral en escritorio y bottom sheet en pantallas pequeñas.

## Decisiones de producto

- Se omitió deliberadamente `Insights y alertas` porque el usuario indicó que repetía información ya representada por acciones pendientes, actividad y KPIs.
- Ventas usa ventas confirmadas del período y comparación contra el período anterior cuando existe una base comparable.
- Cotizaciones abiertas, pedidos activos y stock crítico son snapshots actuales; no se muestran tendencias inventadas para estas métricas.
- Stock crítico excluye productos sin stock informado.
- La tendencia de cada producto usa ingresos confirmados por día dentro del período seleccionado; los días sin venta se rellenan con cero y no se fabrican datos.
- El pipeline excluye oportunidades terminales y conserva la definición de macroetapas del dominio.

## Evidencia visual

- Brave validó el dashboard en escritorio a 1920 × 861.
- Se comprobó que los puntos del gráfico de ventas coinciden con el trazo SVG y que el trazado conserva su relación al redimensionar el contenedor.
- Se comprobó el drawer rediseñado con agrupación visual, iconografía, estados activos y footer de acciones persistente.
- El control categoría–familia fue probado: al elegir `Refrigeración` se cargaron 46 familias y la selección se conservó en el borrador.
- La prueba de aplicación produjo una URL con `range`, `locationId`, `categoryId` y `familyId`; la limpieza devolvió el dashboard a `?range=month` y cerró el drawer.
- El navegador conectado no expone cambio programático de viewport; por ello la interacción móvil no se pudo capturar en 390/768 px, aunque los breakpoints y el bottom sheet están implementados.

## Verificaciones automatizadas

| Verificación | Resultado |
| --- | --- |
| Suites focalizadas de dashboard | PASS — 23/23 |
| `corepack pnpm build` | PASS |
| `git diff --check` | PASS |
| `corepack pnpm exec tsc --noEmit` | BLOQUEADO por error preexistente en `src/components/admin/AdminProductCatalog.tsx` (`item` posiblemente `null`) |
| `corepack pnpm lint` | BLOQUEADO por errores y warnings preexistentes en catálogo/importación; no reportó errores del dashboard rediseñado |
| `corepack pnpm test:inventory` | BLOQUEADO porque falta `INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx` en el workspace esperado |

No se realizó despliegue a producción.
