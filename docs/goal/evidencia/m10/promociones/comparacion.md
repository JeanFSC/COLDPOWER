# M10-01 — comparación visual (revisión Claude)

Ruta validada: `http://localhost:3003/admin/promociones` en la sesión autenticada de ColdPower, con zoom 100%.

## Capturas

| Estado | Implementación final | Referencia aprobada |
| --- | --- | --- |
| Lista desktop, 1920 × 1080 | [lista-1920x1080-review.png](./lista-1920x1080-review.png) | [promociones-desktop-1920x1080.png](../../../designs/promociones/promociones-desktop-1920x1080.png) |
| Detalle desktop | [drawer-1920x1080-review.png](./drawer-1920x1080-review.png) | [promociones-desktop-1920x1080.png](../../../designs/promociones/promociones-desktop-1920x1080.png) |
| Alta desktop | [form-1920x1080-review.png](./form-1920x1080-review.png) | [promociones-form-desktop-1920x1080.png](../../../designs/promociones/promociones-form-desktop-1920x1080.png) |
| Lista mobile, 390 × 844 | [lista-390x844-review.png](./lista-390x844-review.png) | [promociones-mobile-390x844.png](../../../designs/promociones/promociones-mobile-390x844.png) |

## Correspondencia revisada

- Desktop conserva la jerarquía de Comercial → Promociones, cuatro KPI, calendario, cola paginada y drawer lateral.
- El calendario mantiene la leyenda dentro del pie, muestra como máximo seis filas y conserva `Ver todas` sin invadir la cola.
- El drawer muestra datos persistidos, impacto con precios vigentes, uso por canal, conflictos con prioridad/política e historial auditado.
- El formulario usa un drawer de alta, tres pasos, validaciones en vivo, producto real del alcance e `Impacto estimado` en la columna derecha.
- Mobile conserva KPI 2×2, `Vencen pronto`, tarjetas compactas, hoja de detalle y CTA fijo `Nueva promoción`.
- Los valores mostrados provienen de PostgreSQL local. Las campañas de visualización están rotuladas `[DEV]`; no se presentan como datos operativos.

## Revisión Claude — 11 correcciones

1. Gantt: `scalePromotionRange` calcula left/width en porcentaje sobre días calendario de Lima; para 24-set → 01-oct en 18-set → 12-nov da 10,714% y 14,286%. `Hoy` cae en 12,5%, la columna del 25-set.
2. Búsqueda de cola: el icono queda dentro del input, centrado verticalmente.
3. `Filtrar` usa `blue-600`/`blue-700` del admin.
4. Tabla, drawer y mobile usan pluralización real de `producto`, `categoría`, `aplicación`, `conflicto` y `campaña`.
5. Preview: porcentaje `−15 %`, monto fijo `−S/ 15.00` y sólo `SPECIAL_PRICE` muestra `Precio especial`.
6. Footer del formulario conserva Cancelar, Guardar borrador y Crear promoción en una sola línea con mínimos responsive.
7. Fechas visibles en es-PE/Lima (`25 set 2026 · 00:00`); el payload mantiene ISO con offset `-05:00`.
8. Sparkline usa 30 puntos, rellena ceros, área suave y fixture distribuida para evitar el pico vertical final; no invade el texto en 390 px.
9. KPI usa altura intrínseca según contenido; no hay `min-height` de tarjeta que deje hueco inferior.
10. Fixture: `NODE_ENV` y hostname de `DATABASE_URL` deben ser locales (`127.0.0.1`/`localhost`); Neon y producción abortan. Hay prueba automatizada del guard.
11. Se retiró el bloque CSS específico de Promociones de `globals.css`; el responsive vive en clases Tailwind y la página conserva scroll vertical.

La implementación conserva las correcciones base: datos persistidos, precios reales, alcance gobernado, drawer lateral, breadcrumb `Comercial`, enlace a reglas de descuento, estados mobile y auditoría.

No se modificó `AdminShell`, la lógica de precios/descuentos ni el proceso que usa el puerto 3005.
