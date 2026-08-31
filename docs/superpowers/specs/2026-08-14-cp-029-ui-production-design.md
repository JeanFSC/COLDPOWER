# CP-029 — ColdPower UI/UX production design

## Objetivo

Cerrar la experiencia visual de ColdPower 3.0 sobre los contratos y datos existentes. El frontend será permission-aware, no creará una segunda lógica de negocio y no reemplazará valores reales por datos decorativos.

## Alcance y orden

1. **Admin global y operaciones**: shell sticky, navegación por rol, estados compartidos, dashboard Superadmin/Gerencia, landing de Operaciones y superficies de Productos, Inventario, Precios, CRM, Pipeline, Cotizaciones, Ventas, Pedidos, Pagos, CMS, Reportes, Auditoría, Usuarios y Configuración.
2. **Portal cliente y comercio público**: `/cuenta`, catálogo, cards, filtros, paginación, ficha y flujos de cotización existentes.
3. **QA transversal**: estados loading/skeleton/empty/error/unauthorized/disabled/success, accesibilidad, responsive en 1440/1280/1024/768/390/360 y documentación de dependencias pendientes del backend.

## Dirección visual

- **Tesis visual**: software comercial técnico, sobrio y rápido de escanear; navy para estructura, azul técnico para navegación/estado, naranja reservado a acciones principales y superficies blancas con bordes suaves.
- **Composición**: sidebar permanente en escritorio, header de búsqueda y perfil, workspace con una acción primaria por pantalla, tablas densas dentro de scroll interno y panel lateral solo cuando aporta contexto.
- **Contenido**: primero estado real y tarea accionable; las métricas se muestran únicamente si vienen del snapshot/API. Cero, `—`, “Sin datos” y “No disponible” conservarán su significado.
- **Interacción**: navegación por teclado y foco visible; drawers/modales para crear/editar; detalles colapsables para controles secundarios; toast de éxito/error tras mutaciones; skeleton durante cargas y errores con reintento.
- **Motion**: transiciones breves de drawer/modal, hover/focus de filas y cards, y expansión suave de secciones; sin charts animados ni decoración que simule actividad.

## Contratos de UI

- Reutilizar `AdminShell`, `AdminCategoryViews`, repositorios y servicios existentes.
- El sidebar se filtra por permisos reales; los nombres visibles son españoles: `CMS` para Superadmin/Gerencia y `Contenido` para Operaciones cuando ese es el contrato del rol.
- Los módulos no presentarán campos, costos, márgenes, secretos ni acciones que el permiso no autorice.
- Las tablas no mostrarán paginación ficticia: el control se renderiza solo si existe `totalPages > 1` o un contrato de cursor.
- Las fechas se obtienen del período entregado por backend o se calculan desde el período actual; no se conserva el rango fijo de 2024.
- Stock desconocido se representa como `—`/“Desconocido”, distinto de cero; pagos, pedidos, ventas y métodos vacíos muestran empty state real.
- Acciones sin endpoint disponible quedan deshabilitadas o documentadas como dependencia CP-030; no se simula una mutación exitosa.

## Arquitectura de componentes

- `AdminShell`: chrome, sidebar permission-aware, header, ayuda compacta, focus y responsive.
- `AdminPrimitives`/`AdminCategoryViews`: PageHeader, métricas, toolbar, select, table, badges, pager, empty/error/unauthorized, drawer/modal y feedback.
- Workspaces: reciben snapshots y rows ya resueltos por la página; no incluyen arrays de negocio ni valores de respaldo.
- Público/cliente: conservar repositorios server-side y componentes de catálogo, agregando solo presentación, estados y controles que ya tengan contrato.

## Auditoría inicial registrada

- `AdminCategoryViews` mantiene rango fijo `25 may. - 24 jun. 2024`, pager visual fijo, fechas/status/métodos y métricas de pedidos/pagos inventadas, botones `More` sin acción y gráficos/sparklines decorativos.
- Auditoría expone IP fija y serializa before/after como JSON en la tabla en vez de diff legible/drawer.
- Varios módulos muestran defaults como `Lima`, `Bryan`, `Pagado`, `24 jun. 2024` o `3 / 5` cuando el dato no existe.
- Reportes y dashboard requieren distinguir visualmente serie vacía de serie con actividad; no se deben dibujar líneas de actividad si el backend devuelve cero.
- Catálogo público ya es server-side y paginado; se conservará su fuente real y se revisarán densidad, estados y responsive.

## Dependencias pendientes de backend

- Movimientos/alertas de inventario, historial de precios, actividad CRM, detalle de clientes, timeline de pedidos, comprobantes de pago, before/after de auditoría y media library necesitan respuestas existentes o contratos explícitos.
- Cuando un endpoint no exista, la pantalla mostrará un estado honesto y se añadirá una nota técnica con `GET`/respuesta esperada para CP-030. No se crearán tablas ni rutas de negocio en este ticket.

## Verificación

- Contratos UI existentes y nuevos por módulo.
- `corepack pnpm exec tsc --noEmit`, `corepack pnpm lint`, `corepack pnpm build`.
- Tests de dominio/seguridad existentes sin cambios de schema.
- Capturas Playwright por rol y viewport; revisión de overflow, focus, hover, disabled, empty, error y acciones primarias.
