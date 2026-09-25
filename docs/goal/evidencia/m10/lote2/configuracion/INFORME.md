# Configuración · evidencia M10-04 lote 2

Estado: cerrada con límite de datos documentado.

## Capturas

- [Desktop 1920 × 1080](configuracion-1920x1080.png)
- [Mobile 390 × 844](configuracion-390x844.png)

## Comparación con la lámina

Se comparó contra `docs/goal/designs/m10-lote2/configuracion-desktop-1920x1080.png` conservando el encabezado, medidor de completitud, tabs y composición Empresa + Vista previa/Último cambio. La pantalla no rellena valores ficticios: muestra que la empresa está sin datos configurados, 6 locales activos, 0 series activas, IGV sin configurar y 0/5 integraciones conectadas. El guardado aparece únicamente con cambios sucios, los asteriscos permanecen junto al label y las acciones de precio/IGV están bajo la pestaña correspondiente con control SUPERADMIN.

## Interacciones y accesibilidad

- Se recorrieron Empresa, Precios e IGV, Integraciones e Historial.
- Se comprobó que `Probar integración` aparece únicamente en Integraciones.
- Se introdujo temporalmente un RUC inválido con país Perú; la validación `isValidPeruvianRuc` mostró `RUC inválido para Perú` y mantuvo Guardar deshabilitado. Se descartaron los cambios, sin mutación.
- No se guardó un teléfono inventado: la fila real `company_settings.default` no tiene teléfono, WhatsApp, correo ni RUC. El camino de guardado + nueva versión queda condicionado a recibir un dato empresarial fuente; la UI de guardado sólo aparece cuando hay cambios válidos.
- Axe: [axe.json](axe.json), `violations: []`, `incomplete: []`.
- Consola: [configuracion-console.txt](configuracion-console.txt), 0 errores; las advertencias son informativas de desarrollo/preload.
- Snapshots: [Empresa](configuracion-ui-empresa.txt), [Integraciones](configuracion-ui-integraciones.txt), [Precios e IGV](configuracion-ui-precios.txt), [RUC inválido](configuracion-ui-ruc-invalido.txt), [Descartar](configuracion-ui-discard.txt), [Historial](configuracion-ui-historial.txt).

## Recorrido UI + SQL

1. Carga autenticada de `/admin/configuracion` en desktop y mobile.
2. Se verificaron los conteos reales de completitud y la versión vigente 29.
3. La consulta de control está en [sql-journey.txt](sql-journey.txt): 6/6 locales activos, 0/0 series, 0/5 integraciones conectadas, tipos de precio activos `COST,RETAIL` y 28 entradas de historial.
4. Los campos de empresa se preservan como nulos/vacíos cuando la base no tiene configuración; no se usaron los valores de la lámina como datos operativos.
