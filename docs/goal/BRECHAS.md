# Brechas abiertas — ColdPower (2026-09-24)

Estado: ⏳ en curso · 📋 con brief listo · 🧑 decisión o acción de Jean · ✅ cerrada

| # | Brecha | Solución | Dónde | Estado |
|---|---|---|---|---|
| 1 | Una sola base Neon para todo; cuota agotada | Base local de desarrollo; Neon solo para el sitio | brief 14 | ✅ base local · 🧑 plan de Neon |
| 2 | Respaldos parciales (10 tablas) | `pg_dump` completo + restauración probada + tarea diaria | brief 16 | 📋 |
| 3 | 1.344/1.348 productos en revisión | Cola de publicación en lote (decide Jean) | brief 16 | 📋 · 🧑 qué publicar |
| 4 | Falta el Excel fuente del catálogo | Copiarlo a `INVENTARIO CATALOGO/` | — | 🧑 |
| 5 | Pago y tracking simulados | Pasarela (Culqi/Izipay/Niubiz) + courier (Olva/Shalom/Urbaner) | futuro | 🧑 elegir |
| 6 | Home espejo con datos | Ronda 4 (logo, "En oferta") | brief 15 | ⏳ |
| 7 | Header y footer nuevos sin revisar en otras páginas | Recorrido de 17 páginas × 2 viewports | brief 15 | ⏳ |
| 8 | Contador duplicado en el catálogo | Un solo contador | brief 15 | ⏳ |
| 9 | 390 sin evidencia en tareas de Codex | Regla de evidencia con capturas Playwright obligatorias | briefs 15–18 | ✅ regla |
| 10 | Imágenes huérfanas | Script de detección + limpieza | brief 15 | ⏳ |
| 11 | QA del brief 12 inconclusa | 5 informes + Lighthouse + axe antes/después | brief 17 | 📋 |
| 12 | Newsletter / favoritos | Migración 0051 aplicada en local; en Neon con respaldo previo | brief 14 / Claude | ✅ local · pendiente Neon |
| 13 | CMS incompleto | Revisiones, publicación, slots, punta a punta | brief 18 | 📋 |
| 14 | Foto real de producto sin probar | Prueba automatizada de punta a punta | brief 16 | 📋 |
| 15 | Pedido y despacho sin datos | Fixture de pedidos por estado + validación | brief 16 | 📋 |
| 16 | Promociones sin alcance aplican a todo | (a) aviso · (b) exigir alcance — recomendado (b) | futuro | 🧑 decidir |
| 17 | Legal y contacto | Términos, Privacidad (Ley 29733), Cambios y devoluciones + contacto en Configuración | futuro | 🧑 datos + revisión legal |
| 18 | 12 advertencias de lint | Dejar lint en 0/0 | brief 15 | ⏳ |
| 19 | Codex declara validaciones sin evidencia | Sin captura no hay validación | briefs | ✅ regla |
| 20 | Contratos ajustados a la implementación | Justificación obligatoria al editar un contrato | briefs | ✅ regla |
| 21 | Tareas paralelas se pisan | Secuencial (o un worktree por tarea) | Claude | ✅ |
| 22 | Procesos de Codex que no terminan | Vigilante que detecta el archivo final y cierra el proceso | Claude | ✅ |
| 23 | Codex sin sandbox | Sin `.env.local` de Neon en las tareas; solo base local | Claude | ⏳ |

## Actualización 2026-09-24 (tarde)

| # | Brecha | Estado |
|---|---|---|
| 1 | Base de desarrollo separada | ✅ PostgreSQL 18 local como servicio (5433). 🧑 Neon sigue sin cuota |
| 2 | Respaldos completos | ✅ `pg_dump` completo + restauración probada (93 tablas). **Manuales**, solo cuando Jean los pida |
| 3 | Cola de publicación | ✅ herramienta lista. 🧑 Jean decide qué publicar |
| 6–8, 10, 18 | Home espejo, chrome en 19 rutas, contador, imágenes huérfanas, lint | ✅ |
| 9, 19–23 | Proceso de orquestación | ✅ protocolo en `docs/goal/ORQUESTACION.md` |
| 12 | Newsletter / favoritos | ✅ en local · pendiente en Neon |
| 13 | CMS | ⛔ omitido y oculto por decisión de Jean |
| 14 | Foto real de punta a punta | ✅ |
| 15 | Pedidos y despacho | ✅ fixtures y validación |
| 17 | Legal | ✅ borradores detrás del flag · 🧑 completar `[DEFINIR]` + revisión legal |

### Nuevas (QA brief 17, verificadas por Claude)
| # | Brecha | Severidad | Estado |
|---|---|---|---|
| 24 | Aprobación tardía de un pago REJECTED/ERROR/CANCELLED ignorada en silencio (riesgo de cobro doble sin rastro) | P1 | 📋 R3 |
| 25 | Recepción de OC y conversión solicitud→OC se rompen al escribir (`currentTarget` null) | P1 | 📋 R3 |
| 26 | IGV "Por configurar" visible al cliente; falta configurar la tasa y la modalidad | P2 | 📋 R3 · 🧑 Jean define la modalidad |
| 27 | La validación de RUC bloquea la edición de clientes antiguos | P2 | 📋 R3 |
| 28 | LCP móvil 4,8 s (meta 2 s) | P1 | 📋 R3 |
| 29 | Número de WhatsApp comercial sin configurar | — | 🧑 Jean |
| — | Informe R2 de Gemini: 3 de 4 defectos fueron falsos positivos (probó escribiendo directo en la base) | — | anotado en `gemini/informe-r2.md` |
