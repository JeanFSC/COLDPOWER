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
