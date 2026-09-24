# Brief 17 — Terminar la QA final (brief 12) sobre la base local (Codex)

Lee `docs/goal/briefs/12-qa-final.md` y `docs/goal/usabilidad-escenarios.md` completos. Base de datos **local** (`.env.localdb`). Nunca Neon. Rama `codex/goal-impecable`.

El brief 12 quedó a medias:
- solo existen las líneas base de axe en `docs/goal/usabilidad/capturas/`;
- se aplicaron correcciones parciales de accesibilidad;
- **no existe ningún informe**.

Desde entonces cambiaron el home (espejo) y el header y footer globales.

## Qué entregar (obligatorio)
Los 5 informes de `docs/goal/usabilidad/`:
- `A-tienda.md`
- `B-staff.md`
- `C-recorridos.md`
- `rendimiento.md`
- `accesibilidad.md`

Cada escenario de A1–A4, B1–B7 y C1–C10 lleva:
- ✅/❌;
- factores de la matriz D;
- severidad;
- **captura** en `docs/goal/usabilidad/capturas/`;
- archivo:línea del defecto.

## Cómo
- **Servidores QA por rol** con el bypass de desarrollo, apuntando a la base local. Un servidor por turno, en el puerto 3003; apágalo al terminar. El 3002 lo usa Claude.
- **Flujos completos:**
  - cotización → venta → pedido → pago mock → despacho → entrega;
  - compra web con login → pago mock → seguimiento.
- **Lighthouse** sobre `build && start` con `.env.localdb`: home, catálogo y ficha, escritorio y móvil. Tabla antes/después. Metas: LCP < 2,0 s, CLS < 0,05, Performance ≥ 90.
- **axe** en las mismas páginas y en los módulos admin. Tabla antes/después respecto a la línea base existente.
- Corrige todos los P0/P1 y los P2 de bajo riesgo, y repite el escenario afectado.
- El home no se rediseña: es el espejo aprobado. Solo arreglos de accesibilidad o rendimiento sin cambiar la composición.

## Verificación
- Sin commit.
- `tsc`, lint (0/0), `test-all` y `build`.
- Reporta:
  - tabla de escenarios;
  - métricas;
  - violaciones de axe;
  - pendientes;
  - archivos cambiados.
