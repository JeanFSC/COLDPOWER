# Estado del goal "ColdPower impecable"

Rama: `codex/goal-impecable`. Implementa Codex (gpt-5.6-luna, razonamiento max, `codex exec -s danger-full-access`); Claude audita, aprueba diseño, verifica en navegador y hace commit.

| Fase | Módulo | Auditoría | Diseño | Implementación | Verificado | Commit |
|---|---|---|---|---|---|---|
| — | P0 transversales (pagos/reservas, auditoría, invitaciones, promociones, compras, cotizaciones, reservas) | hecha | — | hecha | tests + smoke | 3251004, 769d3df, 8463138, 7cef0ec |
| A | Fundaciones (landing por rol, sin-acceso, menú, error.tsx, limpieza, fuente) | hecha | — | hecha | navegador SUPERADMIN/ALMACEN | 6fc42c1 |
| B | Tienda visual | hecha | en curso (brief 03) | — | — | — |
| C | Cotizaciones → Ventas → Pedidos → Pagos | hecha | pendiente (parte B) | lógica en curso (brief 04-A) | — | — |
| C | Inicio/Dashboard | parcial (en fundaciones) | | | | |
| C | Catálogo/Taxonomía/Precios | pendiente | | | | |
| C | Inventario / Compras | hecha | | P0 hechos | | 7cef0ec |
| C | Clientes / CRM | hecha | | deep-links hechos | | 6fc42c1 |
| C | Operaciones / Promociones | hecha | | P0 promociones hechos | | 7cef0ec |
| C | Reportes / Notificaciones / Auditoría / Usuarios / Configuración | hecha | | P0 seguridad hechos | | 8463138, 7cef0ec |
| C | CMS (oculto) | pendiente | | | | |
| D | QA total | — | — | — | — | — |

## Bitácora
- 2026-09-22: checkpoint CP060, rama, prompt maestro, 7 auditorías, P0 de reservas pagadas y seguridad de auditoría/invitaciones.
- 2026-09-23: P0 de promociones/compras/cotizaciones/reservas/invitaciones (Codex). Plugin de Codex inestable → se usa `codex exec` sin sandbox (aprobado por Jean). Fundaciones del admin cerradas y verificadas en navegador. Lanzados brief 03 (diseño tienda) y 04-A (lógica comercial).
- Pendiente externo: `test:inventory` / `inventory-import.test.mjs` requieren el Excel `INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx`, que no está en disco.
