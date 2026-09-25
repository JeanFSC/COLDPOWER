# Proveedor · evidencia M10-04 lote 2

Estado: cerrada.

## Capturas

- [Desktop 1920 × 1080](proveedor-1920x1080.png)
- [Mobile 390 × 844](proveedor-390x844.png)
- [Drawer de edición](proveedor-editar-drawer-1920x1080.png)

## Comparación con la lámina

Se comparó contra `docs/goal/designs/m10-lote2/detalle-proveedor-desktop-1920x1080.png` con el mismo eje de KPIs, órdenes abiertas, recepciones y contacto. La pantalla usa el proveedor real disponible en PostgreSQL (`LG Electronics`); no replica el proveedor ficticio de la lámina. Se mantuvo el gutter único a todo el ancho, tarjetas con altura de contenido y textos legibles ≥11/13 px. Los campos de contacto ausentes muestran acciones inline para agregarlos y no se muestran valores `N/D`.

## Accesibilidad y consola

- Axe: [axe.json](axe.json), `violations: []`, `incomplete: []`.
- Consola: [proveedor-console.txt](proveedor-console.txt), 0 errores. Las advertencias son informativas de desarrollo (Next LCP/Clerk).
- Recorrido y snapshots: [proveedor-ui-desktop.txt](proveedor-ui-desktop.txt), [proveedor-edit-drawer-ui.txt](proveedor-edit-drawer-ui.txt), [proveedor-ui-recorrido-final.txt](proveedor-ui-recorrido-final.txt).

## Recorrido UI + SQL

1. Carga autenticada de `/admin/compras/proveedores/cp-dashboard-v5-cp-compras-dev-supplier-lg` en desktop y mobile.
2. Se verificaron las 3 órdenes abiertas, 2 recepciones y 3 referencias persistidas que muestra la pantalla.
3. Se abrió `Editar`, se comprobó el drawer y el estado inicial sin cambios; se canceló sin mutar datos.
4. Se verificaron los estados de contacto faltantes y sus acciones de alta inline.
5. Se abrió `OC-DEV-008` y se comprobó la ruta con `purchaseId`; luego `Crear OC` llevó a la vista con `LG Electronics · PEN` preseleccionado. No se guardó una orden nueva.
6. La consulta de control está en [sql-journey.txt](sql-journey.txt): proveedor activo `LG Electronics`, 3 compras abiertas por `970.00` PEN, 2 recepciones y 3 productos.
