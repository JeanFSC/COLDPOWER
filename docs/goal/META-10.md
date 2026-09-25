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

## 5. Bitácora
- 2026-09-25 00:5x: meta asignada. Inventario creado. Auditoría visual en espera de RAM (Codex R3b compilando).
