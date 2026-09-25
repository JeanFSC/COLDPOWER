# Consola y runtime — revisión Claude

- Ruta: `http://localhost:3003/admin/promociones`; viewports revisados: 1920 × 1080 y 390 × 844.
- Consola final: **0 errores** en lista, drawer y formulario; no hay errores de hidratación ni del módulo.
- Advertencias no bloqueantes del entorno dev: Clerk development keys, recomendación LCP de Next y preload de CSS de Next durante hot reload. No son errores de Promociones.
- El formulario ejecutó el preflight real `POST /api/admin/promociones/preview` y recibió `200`.
- El drawer cerró con Escape, volvió a la URL sin `id` y devolvió el foco a la campaña que lo abrió.
