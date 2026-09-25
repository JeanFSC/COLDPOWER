# META 10/10 — ColdPower (asignada por Jean el 2026-09-25)

> "Deja el sistema 10/10, abarca todo. Audítalo y, según lo que halles, ve arreglándolo hasta llevarlo a 10/10, donde ya no se pueda mejorar sino que sean retoques que yo te diga."

Dueño: Claude (jefe). Ejecución: Codex (diseño en imagen y luego implementación). Auditoría independiente: Gemini (solo lectura). Protocolo: `docs/goal/ORQUESTACION.md`.

## 1. Rúbrica (cada superficie se puntúa de 0 a 10; aprobado = 9,5 o más)
1. **Propósito y flujo:** la pantalla resuelve la tarea real del rol en el menor número de pasos. Nada decorativo sin función.
2. **Jerarquía:** en 3 segundos se sabe qué es lo importante (estado, riesgo, siguiente acción).
3. **Densidad eficiente:** a 1920×1080 se ve lo necesario sin scroll innecesario, sin huecos muertos ni paneles estirados (regla: ningún panel se estira sin contenido).
4. **Lenguaje del sistema:** usa los mismos tokens, patrones y componentes que los módulos de referencia (ver §3). Nada "genérico": no tablas planas sin contexto ni cajas de KPI sin tendencia.
5. **Datos reales y útiles:** KPI con comparación o tendencia; columnas con la información que decide; nada inventado.
6. **Estados completos:** vacío (con acción), carga (skeleton), error (con reintento), sin permiso, éxito y confirmaciones destructivas.
7. **Interacción:** filtros persistentes en la URL, acciones masivas donde aplica, drawer de detalle, atajos, feedback inmediato y prevención de doble acción.
8. **Responsive:** 1920 (principal), 1440, 1024 y 390 sin overflow horizontal ni texto cortado.
9. **Accesibilidad:** axe sin violaciones, foco visible, teclado completo, contraste AA y labels.
10. **Pulido:** alineación a la grilla, iconografía consistente, microcopy en español claro, números con formato PEN y hora de Lima.

## 2. Inventario de superficies y estado
Leyenda: ⬜ sin auditar · 🔎 auditado · 🎨 en diseño · 🛠 implementando · ✅ ≥ 9,5

### Admin (22)
| Módulo | Nota | Estado | Observación |
|---|---|---|---|
| promociones | — | 🎨 | Código genérico (KPIs planos, tabla plana, 100% tokens de tienda). Señalado por Jean. Diseño en curso (`designs/promociones/prompt.md`) |
| taxonomia | — | 🔎 | Genérico: listas planas con formularios; tokens de tienda (16/0). Bug de texto: "categories actualizado." |
| configuracion | — | 🔎 | `CompanySettingsForm` fuera de estilo (tienda 87 / admin 23) |
| catalogo/[id] | — | 🔎 | `ProductCommercialEditor` fuera de estilo (22/0) y `DuplicateDecisionControl` (8/0) |
| clientes (drawer) | — | 🔎 | `CustomerDetailPanel` fuera de estilo (4/3) |
| categorías (vistas) | — | 🔎 | `AdminCategoryViews` fuera de estilo (8/3) |
| precios | — | ⬜ | Mayormente en estilo (23/167); auditar visualmente |
| inicio / dashboard | — | ⬜ | Stitch |
| pagos, pedidos, ventas, compras, inventario | — | ⬜ | Stitch / Tanda |
| cotizaciones, crm, clientes, operaciones | — | ⬜ | |
| catalogo, catalogo/[id] | — | ⬜ | |
| reportes, usuarios, auditoria, notificaciones | — | ⬜ | Stitch |
| sin-acceso | — | ⬜ | |
| cms | — | ⛔ oculto por decisión de Jean | |

### Tienda y cuenta
| Superficie | Nota | Estado |
|---|---|---|
| Home (espejo de la referencia; solo retoques técnicos) | — | ⬜ |
| catalogo, categoria/[slug], buscar, comparar | — | ⬜ |
| producto/[slug] | — | ⬜ |
| carrito, checkout, pago/prueba, cotizacion | — | ⬜ |
| cuenta, cuenta/pedidos, pedidos/[code], cotizaciones, pagos, historial, carrito | — | ⬜ |
| contacto, nosotros, faq, libro-de-reclamaciones, legales | — | ⬜ |
| sign-in / sign-up (Clerk) | — | ⬜ |
| 404 / error / loading | — | ⬜ |

### Salidas
| Superficie | Nota | Estado |
|---|---|---|
| PDF de cotización | — | ⬜ |
| Correos transaccionales, si existen | — | ⬜ |
| Exportaciones CSV (nombres de columnas, formato) | — | ⬜ |

## 3. Lenguaje de diseño del admin (especificación para Codex)
Extraído de los módulos de referencia (Pagos, Inicio, Reportes, Usuarios).
- **Paleta:** slate (texto 900/700/500/400, bordes `slate-200/90`, fondos `slate-50`) y acción `blue-600`. Semánticos: emerald = OK, amber = atención, red = riesgo, orange = pendiente de acción. **No** mezclar tokens de la tienda (`text-dark`, `rounded-pill`, `border-border`) en el admin.
- **Tarjeta:** `rounded-xl border border-slate-200/90 bg-white p-4|p-5 shadow-2xs`.
- **Etiquetas:** `text-[10px] font-bold uppercase tracking-wide text-slate-400`.
- **Números KPI:** `text-2xl font-bold tracking-tight text-slate-900`, con delta vs. el periodo anterior, sparkline y contexto ("de X", "vence en Y").
- **Códigos y SKU:** `font-mono`.
- **Tablas:** encabezado compacto, filas `text-xs/text-sm`, `truncate` con tooltip, hover `slate-50/60`, columna de acciones fija y paginación con conteo.
- **Detalle:** `AdminDrawer` lateral, nunca un modal a pantalla completa para un detalle.
- **Filtros:** una barra de filtros con chips de estado con conteo, búsqueda con icono y filtros persistentes en la URL.
- **Shell:** `AdminShell`, con el título del módulo, breadcrumb de grupo y acciones primarias arriba a la derecha.

## 4. Proceso por superficie que no alcanza 9,5
1. **Claude** audita con captura a 1920 y 390 y el código, y la puntúa con la rúbrica.
2. **Claude** escribe el **prompt de diseño**: tarea del rol, datos reales disponibles (esquema y repositorio), flujos, estados y lenguaje de §3.
3. **Codex** genera la **imagen del diseño** (skill de generación de imágenes) a 1920×1080. **Claude** la aprueba o pide iteración. Sin aprobación no se implementa.
4. **Codex** implementa (skill `product-design:image-to-code`), con datos reales, estados y responsive.
5. **Claude** compara la captura real contra la imagen aprobada, vuelve a puntuar y actualiza esta tabla.
6. **Gemini** audita de forma independiente las superficies cerradas (solo lectura). Sus hallazgos se verifican antes de actuar.

## 4b. Auditoría visual v1 (2026-09-25, capturas a 1920 y 390 de la rama `6d8fce6`; Claude)

### Admin
| Módulo | Nota | Defectos principales | Tratamiento |
|---|---|---|---|
| taxonomia | 2 | Lista plana de más de 100 filas (14.000 px), sin jerarquía ni conteos, tokens de tienda, mensaje "categories actualizado." | 🎨 lote 2 |
| catalogo/[id] | 3 | Formularios sueltos, filtro de fechas sin propósito, tarjeta beige, botones negros, "Choose File" en inglés, sin checklist ni vista de tienda | 🎨 lote 2 |
| compras/proveedores/[id] | 4 | Contenedor angosto (media pantalla vacía), todo "N/D", sin OC, recepciones ni productos | 🎨 lote 2 |
| configuracion | 6 | KPIs sin sentido ("Locales 0.0% vs período anterior"), asterisco en línea aparte, primario "Probar integración", estilo de tienda | 🎨 lote 2 |
| promociones | 8,5 (v2) | Gantt mal escalado, icono de búsqueda desalineado, botón negro, plurales, fechas crudas, sparkline, CSS global | 🛠 M10-01b |
| inicio | 7 | KPIs con media tarjeta vacía, actividad genérica ("actualización registrada"), "Resumen operativo" con hueco, "Abrir módulo" repetido | 🛠 M10-02 |
| cotizaciones | 7 | Contenedor más angosto que el resto, códigos partidos en 2 líneas, filas altas, fecha partida, "Por cotizar / Moneda pendiente" | 🛠 M10-02 |
| ventas | 7 | "Ticket promedio" con tarjeta enorme para 1 dato, panel de métodos cortado, anillo de foco naranja | 🛠 M10-02 |
| pagos | 7,5 | "Transferencia" duplicada, método "mock" crudo, tarjeta del donut con hueco | 🛠 M10-02 |
| notificaciones | 7 | Textos con valores internos ("proveedor mock", "CONFIRMED"), códigos de regla visibles, panel central vacío | 🛠 M10-02 |
| clientes | 7 | KPIs duplicados en el panel "Resumen de clientes", CTA naranja | 🛠 M10-02 |
| precios | 7,5 | Etiquetas repetidas dentro de celdas, columna "Actualizado" cortada, KPIs altos | 🛠 M10-02 |
| auditoria | 8 | Eventos con fecha futura (datos de prueba), panel de detalle con hueco, "+13950%" | 🛠 M10-02 |
| usuarios | 8 | KPI duplicado (activos = registrados), "Nunca registrado" en todos, Exportar duplicado | 🛠 M10-02 |
| compras | 8,5 | Texto encimado "PENS/ 970" en "Rendimiento por proveedor" | 🛠 M10-02 |
| inventario | 8 | CTA naranja, panel derecho con texto cortado | 🛠 M10-02 |
| catalogo | 8 | CTAs naranjas, checklist recargado | 🛠 M10-02 |
| dashboard, operaciones, pedidos, crm, reportes | 8–8,5 | Porcentajes absurdos vs. el periodo anterior con base pequeña | 🛠 M10-02 (global) |

**Globales del admin (M10-02):**
- el bloque "¿Necesitas ayuda?" tapa ítems del menú;
- CTA primario siempre `blue-600` (hoy mezcla con naranja);
- anillo de foco del admin `blue`, no naranja;
- ancho de contenido uniforme;
- deltas "vs. período anterior": si la base es menor a 5 o igual a 0, mostrar "Nuevo" o "Sin base comparable" y **no** porcentajes de 4 cifras;
- ningún enum ni código interno como texto principal.

### Tienda y cuenta
| Superficie | Nota | Defectos | Tratamiento |
|---|---|---|---|
| producto/[slug] | 7,5 | Chip interno "ESTADO FUENTE: ACTIVO" visible al cliente, "Bajo consulta" duplicado, descripción de relleno automática, CTA de compra o cotización bajo el pliegue a 1920, "UNIDAD (BIENES)" crudo | 🛠 M10-03 |
| cotizacion | 7 | Sin tildes ni "¿": "cotizacion", "Que repuesto", "Telefono", "digitos", "encontre"… | 🛠 M10-03 |
| cuenta (hub) | 5 | Hero de marketing gigante; pedidos y cotizaciones bajo el pliegue | 🎨 lote 3 |
| cuenta/* | 6 | Sin navegación de cuenta entre subpáginas; vacíos genéricos | 🎨 lote 3 |
| 404 | 8,5 | Chip "Imagen referencial" sobre la ilustración | 🛠 M10-03 |
| carrito, catalogo, categoria, contacto, faq, nosotros, reclamaciones | 8–8,5 | Pendiente de revisión fina de copy | 🛠 M10-03 |
| home | espejo | Solo retoques técnicos (rendimiento R4) | R4 |

### Olas
1. **M10-01b:** Promociones a ≥ 9,5 (en curso).
2. **Diseño lote 2:** Taxonomía, Producto (admin), Proveedor y Configuración (en curso) → aprobación → implementación M10-04.
3. **M10-02:** globales del admin y correcciones puntuales (lista de arriba).
4. **M10-03:** tienda (producto, tildes, 404, copy).
5. **Diseño lote 3:** hub de Mi cuenta y navegación de cuenta → implementación.
6. **R4:** rendimiento (brief `17-R4-rendimiento.md`).
7. **Re-auditoría v2** completa, más la auditoría independiente de Gemini (solo lectura) → nada bajo 9,5.

## 5. Bitácora
- 2026-09-25 00:5x: meta asignada. Inventario creado. Auditoría visual en espera de RAM (Codex R3b compilando).
