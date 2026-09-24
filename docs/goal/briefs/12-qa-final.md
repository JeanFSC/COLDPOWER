# Brief 12 — Fase D: QA final y usabilidad por persona (Codex)

Lee completos `AGENTS.md`, `docs/goal/GOAL-IMPECABLE.md` (definición de terminado, metas de rendimiento) y **`docs/goal/usabilidad-escenarios.md` entero**: A, B, C, la matriz D y la severidad E. Rama `codex/goal-impecable`. Trabajas solo.

## Entorno
- Servidor QA propio en otro puerto (p. ej. 3003) con el bypass de desarrollo, **uno por rol**:
  - `CP_DEV_AUTH_BYPASS=true`, `CP_DEV_AUTH_USER_ID=<fixture>`, `CP_DEV_AUTH_ALLOWED_HOSTS=localhost:<puerto>`.
  - Fixtures: `cp-dashboard-v5-user-almacen`, `-staff-001` (VENTAS), `-staff-004` (REPORTES), `-staff-005` (JEFATURA), `-staff-006` (ADMIN), `-compras`, `-ventas` (OPERACIONES_VENTAS), `-gerencia`, y SUPERADMIN `user_3HsX8RHS2xwA0sPrSpXAe5SdDOO`.
  - Reinicia el servidor al cambiar de rol.
- **No toques el puerto 3000, el túnel ni el 3002.**
- Si un escenario necesita datos, usa o crea una fixture de desarrollo idempotente y protegida contra producción (`AGENTS.md` → Visual data fixtures). La base de datos es de desarrollo.
- Para 390 px usa Playwright o Chrome headless con viewport real. Tomar captura es obligatorio.

## Qué ejecutar
1. **Escenarios A1–A4, B1–B7 y C1–C10**, recorridos en el navegador como esa persona, cruzados con los factores de la matriz D que apliquen. Incluye el flujo completo:
   - cotización → venta → pedido → pago (mock) → despacho → entrega;
   - compra web con login → pago mock → seguimiento.
2. **Viewports:** 1920, 1440, 1024, 768 y 390 en las páginas clave de la tienda y de cada módulo admin. Revisa desbordes, teclado/foco y consola.
3. **Rendimiento:** Lighthouse CLI sobre `next build && next start` en tu puerto, en home, catálogo y ficha de producto, escritorio y móvil. Metas: LCP < 2,0 s, CLS < 0,05, Performance ≥ 90. Para el admin, tiempo de respuesta del servidor por módulo.
4. **Accesibilidad:** axe-core (inyectado vía Playwright) en las mismas páginas, más contraste AA.

## Registro
- Un archivo por grupo en `docs/goal/usabilidad/`: `A-tienda.md`, `B-staff.md`, `C-recorridos.md`, `rendimiento.md`, `accesibilidad.md`.
- Cada hallazgo con: escenario, factor, severidad P0–P3, evidencia (ruta de captura en `docs/goal/usabilidad/capturas/`), archivo:línea y conducta esperada.

## Corrección
- Corrige todos los P0 y P1, y los P2 que sean de bajo riesgo.
- **El home no se rediseña** (solo arreglos puntuales de rendimiento o accesibilidad sin cambiar la composición).
- Reglas de AGENTS.md intactas: no inventar precio, stock ni compatibilidad; SKU inmutable; cotización transaccional.
- Cambios visuales dentro del lenguaje actual, sin paneles estirados sin contenido.
- Tras corregir, repite el escenario afectado y márcalo como resuelto en el registro.

## Verificación final
- Sin commit. Tests con `--test-timeout=60000`. Aborta comandos de más de 3 min (excepto build/Lighthouse).
- Migraciones: genéralas, no las apliques.
- Al final: `tsc`, `corepack pnpm lint` con 0 errores, `node scripts/test-all.mjs` (solo se acepta el fallo del Excel externo) y `corepack pnpm build`.
- Detén tus servidores al terminar.
- Reporta:
  - tabla de escenarios (✅/❌);
  - métricas de Lighthouse antes/después;
  - violaciones de axe antes/después;
  - hallazgos corregidos y pendientes;
  - archivos cambiados;
  - riesgos.
