# Comparación visual M10-05 — Mi cuenta

## Referencias

- `docs/goal/designs/m10-lote3/cuenta-hub-desktop-1920x1080.png`
- `docs/goal/designs/m10-lote3/cuenta-hub-mobile-390x844.png`
- `docs/goal/designs/m10-lote3/cuenta-pedidos-desktop-1920x1080.png`
- `docs/goal/designs/m10-lote3/cuenta-vacia-desktop-1920x1080.png`
- `docs/goal/designs/m10-lote3/spec.md`

## Resultado

La implementación conserva la composición de TIENDA y la jerarquía de las láminas: topbar y header comercial reales, navegación técnica, breadcrumb, sidebar de cuenta, hub de actividad, seguimiento, listas recientes y navegación común responsive.

| Área | Lámina | Implementación validada |
| --- | --- | --- |
| Shell | Header/topbar/footer de tienda | Se reutiliza el shell real de ColdPower. El footer permanece presente; no se copió la superposición de iconos de la lámina. |
| Hub con datos | Prioridad, pedido en curso, actividad y volver a comprar | Datos reales del cliente A: 3 pedidos, 2 cotizaciones y 3 pagos. La cantidad de tarjetas varía con los datos, sin inventar ítems. |
| Hub vacío | Tres rutas iniciales compactas | Las tarjetas ajustan su alto al contenido, mantienen las tres rutas útiles y no dejan espacio interno artificial. |
| WhatsApp | Bloque de asesoría cuando está configurado | No se muestra en esta ejecución porque Company Settings local no tiene número configurado. |
| Datos de facturación | Banner solo cuando falta información | No se muestra para el cliente A porque tiene RUC/documento y dirección completos. |
| Cuenta verificada | Badge condicionado a Clerk | Solo se renderiza cuando el `currentUser` de Clerk coincide con el usuario de la vista y el correo primario está verificado. |
| Personal | Acceso administrativo | Visible únicamente para el rol persistido de personal; el fixture local usado tiene `role_code=SUPERADMIN`. |
| Mobile | Pestañas horizontales con scroll y tarjetas apiladas | Validado a 390 × 844; se eliminó el desborde horizontal de la página sin quitar el scroll interno de navegación. |

## Capturas

- Hub con datos: [1920](hub-datos-1920.png), [390](hub-datos-390.png)
- Hub vacío: [1920](hub-vacio-1920.png), [390](hub-vacio-390.png)
- Pedidos: [1920](pedidos-1920.png), [390](pedidos-390.png)
- Cotizaciones: [1920](cotizaciones-1920.png), [390](cotizaciones-390.png)
- Pagos: [1920](pagos-1920.png), [390](pagos-390.png)

Las diferencias de contenido frente a la lámina son deliberadas: la especificación exige representar datos comerciales reales y el estado vacío real, no ejemplos decorativos.
