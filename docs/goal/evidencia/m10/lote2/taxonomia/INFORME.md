# Taxonomía · evidencia M10-04 lote 2

Estado: cerrada.

## Capturas

- [Desktop 1920 × 1080](taxonomia-1920x1080.png)
- [Mobile 390 × 844](taxonomia-390x844.png)
- [Drawer de marca](taxonomia-marca-drawer-1920x1080.png)
- [Dialog de desactivación](taxonomia-desactivar-dialog-1920x1080.png)

## Comparación con la lámina

Se comparó contra `docs/goal/designs/m10-lote2/taxonomia-desktop-1920x1080.png` usando el mismo shell administrativo, eje de cuatro KPI, árbol/detalle/marcas y estados responsive. Se conservaron los datos que existen en PostgreSQL: 27 categorías, 171 familias, 60 marcas y 1,348 productos; la pantalla no replica cifras ficticias de la lámina. No hay sparklines, no hay tarjetas estiradas y el detalle editorial de marca vive en drawer.

## Accesibilidad y consola

- Axe: [axe.json](axe.json), `violations: []`, `incomplete: []`.
- Consola: [taxonomia-console.txt](taxonomia-console.txt), 0 errores. Las advertencias son las informativas de Next LCP/Clerk en desarrollo; no hay excepción de ejecución.
- Snapshots: [taxonomia-snapshot.txt](taxonomia-snapshot.txt), [taxonomia-drawer-snapshot.txt](taxonomia-drawer-snapshot.txt), [taxonomia-dialog-snapshot.txt](taxonomia-dialog-snapshot.txt).

## Recorrido UI + SQL

1. Carga autenticada de `/admin/taxonomia` en el navegador personal, viewport desktop y mobile.
2. Se verificó el árbol con `Refrigeración`, sus conteos reales y el panel de marcas.
3. Se abrió el drawer de `LG` y se verificaron productos, publicados y revisión editorial.
4. Se abrió el dialog de desactivación de `Aspiradoras`, con `0 productos publicados`; al confirmar, el servidor rechazó la desactivación porque existen familias activas hijas. La consulta no encontró una categoría o familia vacía que pudiera desactivarse sin inventar datos.
5. Se guardó un renombrado real de `Acoples` y se restauró a su nombre original; el recorrido y el rechazo de integridad están en [taxonomia-ui-mutations.txt](taxonomia-ui-mutations.txt).
6. La consulta de control está en [sql-journey.txt](sql-journey.txt) y coincide con lo visible.
