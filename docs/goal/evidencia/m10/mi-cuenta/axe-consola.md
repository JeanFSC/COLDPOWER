# Axe y consola — M10-05

## Axe

- Cliente A, `/cuenta`: `violationCount=0`; ver [axe-report-data.json](axe-report-data.json).
- Cliente B, `/cuenta` vacío: `violations=[]`; ver [axe-report.json](axe-report.json).
- Se corrigieron dos hallazgos de la vista: landmarks `main` anidados/duplicados y contraste insuficiente de los números de las tarjetas vacías.

Los resultados `incomplete` de la ejecución global solo corresponden al shell de tienda existente (gradiente de topbar y tagline dentro del logo); no hay violaciones reportadas.

## Consola

- Cliente A: 0 errores; ver [console-errors-data.log](console-errors-data.log).
- Cliente B: 0 errores; ver [console-errors-empty.log](console-errors-empty.log).
- La única advertencia restante es la notificación estándar de Clerk por usar claves de desarrollo en el entorno local exigido; no es un error de la vista ni aparece en producción con claves de producción. Ver [console-warning.log](console-warning.log).

Durante la validación se detectó y corrigió un update tardío del proveedor de carrito al navegar entre rutas: las solicitudes iniciales ahora se abortan al desmontar, evitando el warning de React sobre actualizar un componente no montado.

## Revalidación M10-05

- Playwright con `GPU_ARGS=[--enable-gpu,--use-angle=d3d11,--ignore-gpu-blocklist]` en `http://localhost:3006/cuenta`.
- Desktop 1920 × 1080 y mobile 390 × 844: HTTP 200, axe `0` violaciones y 0 errores de consola.
- Evidencia automatizada: [revalidation.json](revalidation.json).
