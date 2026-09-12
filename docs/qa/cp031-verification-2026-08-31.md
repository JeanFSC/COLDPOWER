# CP-031 · Verificación funcional y visual del módulo de catálogo

Fecha: 2026-08-31  
Repositorio: `C:\Users\jean_\Desktop\COLDPOWER`  
Ruta verificada: `/admin/catalogo`  
Entornos: `http://localhost:3000` y `https://dev.coldpower.pe`

## Resultado ejecutivo

Estado: **NO APTO PARA CIERRE**.

La superficie principal del catálogo carga datos persistentes y la mayoría de sus flujos de lectura funcionan. Sin embargo, la verificación encontró un bloqueo funcional real: las acciones editoriales masivas se habilitan después de seleccionar productos, pero no ejecutan ninguna operación ni abren el paso de configuración. Además, hay diferencias de contrato visual/copy en creación, importación y publicación.

No se realizaron mutaciones de datos durante esta QA: no se creó ningún producto, no se confirmó ninguna importación, no se publicó/ocultó ningún SKU y no se guardó ninguna decisión de duplicado.

## Evidencia de navegador

La verificación se ejecutó en el navegador Brave del usuario, usando las sesiones disponibles. La referencia visual adjunta era el dashboard administrativo; se conservó su lenguaje visual ColdPower —shell blanco, navy, canvas azul-gris, tarjetas compactas y acentos semánticos— porque el ticket solicita catálogo y no un dashboard. No había una ilustración o cuadro genérico nuevo que requiriera generación de imagen.

### Flujos verificados

| Área | Resultado | Evidencia |
|---|---|---|
| Carga inicial, 5 KPI y tabla | PASS | `01-local-initial.png`, `02-dev-initial.png` |
| KPI con navegación server-side | PASS | Hrefs para total, publicados, revisión, requiere revisión y duplicados pendientes |
| Búsqueda por SKU y estado vacío | PASS | `CP-REF-ACE-0827` devuelve 1 resultado; SKU inexistente muestra empty state |
| Categoría, marca, estado y calidad | PASS | Cada filtro actualiza URL y resultados |
| Filtros avanzados | PASS | `requiresReview=true` devuelve 57 productos y chip removible |
| Ordenamiento y paginación | PASS | SKU asc/desc cambia resultados; página 2 muestra 26–50 de 1,348 |
| Selección visible | PASS | Selecciona 10 filas visibles y limpia la selección sin mutar datos |
| Nuevo producto | PARCIAL | Modal, campos, permisos y dependencia categoría → familia funcionan; ver hallazgo H-02 |
| Importación | PARCIAL | Wizard y dry-run previo visibles; no se subió archivo; ver hallazgo H-03 |
| Preflight de publicación | PASS | Bloquea correctamente un SKU con descripción insuficiente; `06-local-publication-preflight.png` |
| Acciones editoriales masivas | FAIL | Botones habilitados no tienen efecto; ver hallazgo H-01 |
| Drawer de producto | PASS | Carga por ID, tabs Información/Contenido/Multimedia/Comercial/Inventario/Historial; `08-local-product-detail.png`, `08-dev-product-detail.png` |
| Teclado del drawer | PASS | Fila con `tabindex=0`, Enter abre y Escape cierra |
| Revisión de duplicados | PASS | Comparación, decisión y selector de canónico; `09-local-duplicate-review.png` |
| Responsive 1440/1024/768/390 | PASS | Sin overflow horizontal del documento; ver capturas 10–13 |
| Consola dev | PASS | 0 errores reales; solo warnings de Clerk dev y `scroll-behavior` de Next |

## Hallazgos

### H-01 · Acciones masivas editoriales inertes — bloqueador funcional

Se seleccionaron 10 productos visibles. Los controles `Asignar categoría`, `Asignar marca`, `Actualizar precios`, `Actualizar stock` y `Editar atributos` cambiaron a estado habilitado. Al hacer clic en `Asignar categoría`, no apareció configuración, preview, diálogo, toast, cambio de URL ni solicitud de operación.

La implementación confirma el problema: `BulkAction` sólo renderiza un `<button>` con `disabled` y no recibe ni ejecuta `onClick` (`src/components/admin/AdminProductCatalog.tsx:296`). La pestaña `Asignaciones` también muestra un empty state en lugar del flujo de configuración. Esto contradice el requisito del ticket de que las acciones activas sean reales y estén conectadas al endpoint transaccional.

### H-02 · Contrato de creación no coincide completamente con el ticket

El flujo funciona y mantiene la dependencia categoría → familia, pero el modal muestra `Crear producto manual` en lugar de `Nuevo producto`, usa un subtítulo diferente y etiqueta `Tipo de producto opcional`; el input no tiene `required` (`src/components/admin/ProductCreateForm.tsx:74`, `src/components/admin/ProductCreateForm.tsx:100-101`). El ticket lo define como campo requerido.

### H-03 · Diferencias menores de importación y publicación

La importación abre el wizard como `Importar referencias` en lugar de `Importar productos` y acepta `.xls` además de `.xlsx`/`.csv`. La publicación ofrece acciones para seleccionados y preflight, pero no muestra `Publicar productos listos del filtro actual`. No se ejecutaron mutaciones para probar esos caminos.

## Responsive

Se usó un viewport explícito y se inspeccionó cada captura con evidencia visual:

- 1440 px: sidebar completo, cinco KPI en una fila, tabla y rail de resumen.
- 1024 px: sidebar colapsado, KPI en dos columnas y controles conservan legibilidad.
- 768 px: navegación compacta, acciones envuelven correctamente y no hay overflow.
- 390 px: menú hamburguesa, acciones envuelven en dos líneas, KPI apilados y `scrollWidth === clientWidth`.

Evidencia: `10-local-1440.png`, `11-local-1024.png`, `12-local-768.png`, `13-local-390.png`.

## Pruebas técnicas

| Comando | Resultado |
|---|---|
| `corepack pnpm exec tsx --test scripts/catalog-view-model.test.ts scripts/compatibility-safety.test.ts` | PASS: 3/3 |
| `corepack pnpm test:cp031` | FAIL: 15/16 tests TypeScript pasan; falla una aserción de contrato de dashboard por campos extra (`currency`, `granularity`) |
| `corepack pnpm test:inventory` | FAIL: 19/20 pruebas iniciales pasan; falta `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx` |
| `corepack pnpm exec tsc --noEmit` | FAIL: rutas de cotizaciones `follow-up`, `response`, `send` y `version` no cumplen el contexto de parámetros esperado por Next |
| `corepack pnpm lint` | PASS con 0 errores y 24 warnings preexistentes |
| `corepack pnpm build` | Bundle compila; FAIL en el mismo type-check global de rutas de cotizaciones |
| `corepack pnpm test:cp031:runtime` | FAIL: 3/5 pasan; fallan aserciones históricas del dashboard (`noMovement` y actividad reciente), mientras el caso runtime del catálogo pasa |

Los fallos globales de TypeScript, dashboard e inventario no se modificaron porque son ajenos al módulo solicitado. No se inventó el workbook faltante.

## Estado de sesiones y entorno

Next quedó escuchando en `0.0.0.0:3000` y se reactivó `cloudflared` con la configuración local existente, sin exponer el token. La sesión autenticada de dev quedó en `/admin/catalogo` y su búsqueda por `CP-REF-ACE-0827` devolvió 1 resultado. Al intentar repetir el último chequeo local después del build, `localhost` redirigió a `sign-in`; la sesión local que estaba disponible al comienzo no permaneció activa tras el reinicio. No se introdujeron credenciales.

## Recomendación de cierre

Resolver H-01 antes de cerrar CP-031. Después, repetir la matriz de acciones masivas, preflight y consola; luego decidir si H-02/H-03 deben alinearse exactamente con el copy del ticket o aceptarse como diferencias de implementación.
