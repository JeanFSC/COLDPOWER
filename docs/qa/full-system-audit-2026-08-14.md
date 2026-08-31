# QA integral de ColdPower

Fecha: 2026-08-14  
Entorno: localhost:3000  
Alcance: flujo público, autenticación, portal de cliente, dashboard y módulos administrativos.  
Restricción aplicada: no se modificó la UI visual. Los hallazgos de diseño, densidad o apariencia robotizada quedan documentados para el responsable de UI.

## Resultado ejecutivo

El sistema queda estable para QA local y las rutas auditadas no presentan errores bloqueantes de código. Se corrigieron fallos reales de autenticación, contratos JSON, historial de cliente, claves React, alias de categorías, enlaces profundos del dashboard, mensajes corruptos y el listado de taxonomía.

El principal bloqueo para mostrar un catálogo público real no es técnico: hay 1,348 productos importados, pero ninguno está publicado. También faltan datos operativos para probar flujos transaccionales completos: locales de inventario, proveedores, clientes, cotizaciones, pedidos, ventas, pagos y configuración empresarial.

## Cobertura ejecutada

### Público

- Inicio, catálogo, búsqueda, comparación, cotización, checkout, contacto, FAQ, nosotros, reclamaciones, login y registro.
- Las 27 categorías reales respondieron HTTP 200, con título esperado y sin páginas inexistentes.
- Se revisaron 48 enlaces únicos encontrados desde el inicio; no hubo enlaces rotos.
- FAQ: 5 preguntas abiertas correctamente.
- Cotización y checkout vacíos: muestran estado honesto y validaciones; no se simuló éxito con datos falsos.
- Navegación móvil y menú responsive: sin overflow horizontal.

### Cliente autenticado

- `/cuenta`, carrito, cotizaciones, pedidos, pagos e historial.
- El historial ya no genera el error SQL por falta de join con productos.
- Perfil, acceso al panel administrativo, cierre de sesión y nuevo inicio de sesión.
- Validación negativa de perfil sin datos: HTTP 400 JSON legible.

### Administración

Se visitaron las 21 rutas administrativas:

`/admin`, `/admin/dashboard`, `/admin/catalogo`, `/admin/inventario`, `/admin/precios`, `/admin/crm`, `/admin/cotizaciones`, `/admin/ventas`, `/admin/pedidos`, `/admin/compras`, `/admin/pagos`, `/admin/cms`, `/admin/reportes`, `/admin/auditoria`, `/admin/usuarios`, `/admin/configuracion`, `/admin/operaciones`, `/admin/notificaciones`, `/admin/taxonomia`, `/admin/promociones` y sus variantes de CRM.

Todas respondieron HTTP 200 con encabezado principal válido. También se revisaron los endpoints administrativos GET y exportaciones CSV. Las respuestas fueron correctas según permisos y estado de datos.

### Dashboard

- Carga del dashboard autenticado como `SUPERADMIN`.
- Verificación de métricas: ventas, cotizaciones, pedidos, stock crítico, pipeline, usuarios, actividad reciente y stock desconocido.
- Los contratos `salesSeries`, `previousSalesSeries`, `pipelineSummary`, `userSummary`, `recentActivity` y `unknownStock` se mantuvieron estables.
- Enlaces rápidos y búsqueda administrativa probados.
- Reportes, operaciones y filtros principales probados.
- Vista móvil: sin desbordamiento horizontal; menú administrativo abre y cierra.

Los ceros mostrados son coherentes con la base actual; no se inventaron movimientos ni ventas. Exportar y período aparecen deshabilitados cuando no hay datos o configuración suficiente.

### RBAC y autenticación

- `/admin/dashboard` sin sesión redirige al inicio de sesión conservando el host local correcto.
- Usuario autenticado conserva el rol `SUPERADMIN` tras cerrar sesión y volver a iniciar sesión.
- Se comprobó que el middleware y los guards server-side controlan el acceso.
- Endpoints de cuenta sin sesión responden JSON 401 con código de autorización, no HTML ni error interno.
- El menú de usuario permite gestionar cuenta y cerrar sesión.

No se imprimieron secretos, tokens ni URLs externas de Clerk en este reporte.

## Datos verificados

| Elemento | Resultado |
|---|---:|
| Productos esperados/importados/guardados | 1,348 / 1,348 / 1,348 |
| SKUs únicos | 1,348 |
| Categorías | 27 |
| Familias | 171 |
| Marcas | 60 |
| Diferencias contra Excel | 0 |
| Productos publicados | 0 |
| Locales de inventario | 0 |
| Proveedores | 0 |
| Clientes | 0 |
| Cotizaciones | 0 |
| Pedidos, ventas y pagos | 0 |

El producto importado permanece en revisión y el catálogo público respeta esa gobernanza; no se publicaron registros automáticamente.

## Correcciones realizadas durante la auditoría

1. Corrección del host usado por el redirect de autenticación para evitar redirecciones locales incorrectas.
2. Guard API para rutas de cuenta y pagos: respuesta JSON 401 consistente.
3. Corrección de mensajes backend con codificación corrupta.
4. Compatibilidad de la ruta de categoría `repuestos-y-accesorios-generales`.
5. Corrección de enlaces del dashboard hacia el CRM actual.
6. Historial de cliente: agregado el join de productos requerido por la consulta.
7. Cuenta de cliente: claves React únicas para evitar warnings y render inconsistente.
8. Taxonomía: el filtro ausente `active` se interpretaba como `false` porque `URLSearchParams.get()` devuelve `null`. Esto vaciaba el endpoint aunque la página mostrara datos. El endpoint ahora devuelve 27 categorías, 171 familias y 60 marcas.

## Hallazgos pendientes

### Bloqueantes funcionales o de datos

- El catálogo público queda vacío hasta publicar productos desde el flujo editorial.
- Faltan imágenes, precios y stock comercial para una experiencia de catálogo completa.
- Sin locales no se pueden ejecutar ajustes, mínimos, transferencias, reservas ni Kardex real.
- Sin proveedores y órdenes no se puede completar el ciclo de compras y recepción.
- Sin configuración empresarial, CMS publicado y datos comerciales, algunas vistas muestran `N/D`, estados vacíos o placeholders.
- `/libro-de-reclamaciones` informa que el canal está por implementar; es una funcionalidad pendiente, no un problema visual.

### Hallazgos exclusivamente visuales — no modificados

- Compras/proveedores presenta un layout de tres columnas genérico y muy vacío cuando no hay datos.
- Dashboard y reportes tienen grandes áreas de estado vacío y acciones deshabilitadas; visualmente se sienten más como una plantilla que como una operación activa.
- Catálogo admin muestra placeholders de imagen, stock como guion y acciones de fila deshabilitadas mientras faltan datos editoriales.
- Contacto conserva textos de configuración pendiente como “Por confirmar”.
- La cuenta muestra varias tarjetas que llevan al historial; funcionalmente responden, pero existe redundancia visual.

Estos puntos deben atenderse en el trabajo de UI. No se alteraron para respetar la separación con el agente responsable del frontend.

### Calidad técnica no bloqueante

Lint termina con 0 errores y 17 warnings preexistentes de imports no usados y una dependencia de `useEffect`. No impiden build ni ejecución, pero deben limpiarse antes de una política de CI con warnings estrictos.

## Evidencia visual

- [Dashboard desktop](../../output/playwright/08-admin-dashboard-full.png)
- [Dashboard móvil](../../output/playwright/13-admin-dashboard-mobile.png)
- [Catálogo admin](../../output/playwright/09-admin-catalogo-full.png)
- [Inventario admin](../../output/playwright/10-admin-inventario-full.png)
- [Compras y proveedores](../../output/playwright/11-admin-compras-full.png)
- [Reportes](../../output/playwright/12-admin-reportes-full.png)
- [Catálogo público](../../output/playwright/03-catalogo.png)
- [Cotización vacía](../../output/playwright/04-cotizacion-empty.png)

## Verificación técnica final

- `pnpm test:all`: PASS.
- TypeScript (`tsc --noEmit`): PASS.
- Next production build: PASS.
- `pnpm qa:inventory-data`: PASS; 1,348/1,348, sin diferencias.
- `pnpm qa:inventory-db`: PASS; 1,348 productos, 1,348 SKUs únicos, 27 categorías, 171 familias y 60 marcas.
- `git diff --check`: sin errores de whitespace; solo avisos de conversión de finales de línea de Git en archivos existentes.

## Recomendación antes de producción

Completar primero los datos empresariales y operativos, cargar imágenes/precios/stock, revisar y publicar el catálogo desde el flujo editorial, crear al menos un local y un proveedor de prueba, y ejecutar nuevamente los flujos de inventario, compras, cotización, pedido, pago y reportes con datos controlados. Después, hacer la pasada visual de UI sobre los puntos listados arriba.
