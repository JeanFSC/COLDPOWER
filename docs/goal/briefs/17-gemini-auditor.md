# Brief 17-G — Auditoría independiente (Gemini, subjefe)

Eres el **auditor independiente** de ColdPower. El jefe es Claude y el programador es Codex; Codex está probando y corrigiendo en paralelo. Tu trabajo es **encontrar errores por tu cuenta**, sin ver lo que hace Codex.

## Reglas
- **Solo lectura sobre el código.** No edites archivos del proyecto. Solo puedes escribir en `docs/goal/usabilidad/gemini/` (tu informe y tus capturas).
- **Sí** puedes usar la aplicación como un usuario real: crear cotizaciones, pedidos, pagos mock, usuarios de prueba, etc. La base de datos es local y de desarrollo (`.env.localdb`, PostgreSQL 127.0.0.1:5433). **Nunca uses `.env.local` ni Neon.**
- Puedes usar todo lo que tengas: navegador, terminal, SQL de solo lectura para verificar, búsquedas externas (por ejemplo, normativa peruana de comercio electrónico o buenas prácticas), skills y MCP.
- Tu servidor: en esta carpeta (worktree `COLDPOWER-gemini`) corre `corepack pnpm exec dotenv -e .env.localdb -- next build`, y luego `next start --port 3007`, con el bypass de desarrollo para cambiar de rol:
  - variables `CP_DEV_AUTH_BYPASS=true`, `CP_DEV_AUTH_USER_ID=<fixture>` y `CP_DEV_AUTH_ALLOWED_HOSTS=localhost:3007`;
  - fixtures: `cp-dashboard-v5-user-almacen`, `-staff-001` (VENTAS), `-staff-004` (REPORTES), `-staff-005` (JEFATURA), `-staff-006` (ADMIN), `-compras`, `-ventas` (OPERACIONES_VENTAS), `-gerencia`, y SUPERADMIN `user_3HsX8RHS2xwA0sPrSpXAe5SdDOO`;
  - para probar como cliente, desactiva el bypass.
- **No toques otros puertos** (3000, 3002, 3003).

## Qué auditar (los dos criterios de Jean)
Lee `AGENTS.md`, `docs/goal/GOAL-IMPECABLE.md`, `docs/goal/usabilidad-escenarios.md` y `docs/goal/briefs/17-qa-final-local.md` (sección RIGOR EXTREMO). Aplica todo eso.

1. **Usuario normal (comprador):** técnico con prisa en móvil (390 px), taller en escritorio (1920), empresa recurrente y visitante que duda. Completa objetivos reales y también usa el sistema mal.
2. **Usuario del sistema (personal):** cada rol hace su jornada completa e intenta lo prohibido (por UI y llamando a la API directo).
3. **Errores de producción y de secuencia:**
   - montos que no cuadran de cotización a entrega (verifícalo con SQL);
   - inventario;
   - transiciones ilegales;
   - doble clic, dos pestañas, botón Atrás y recarga;
   - sesión;
   - datos límite e inyección;
   - consistencia entre cliente, admin, reportes y auditoría;
   - hora de Lima;
   - errores en la consola del navegador y en el log del servidor.
4. **Home:** debe ser espejo de `docs/goal/designs/home-espejo/referencia.png`. Reporta diferencias visuales, pero **no propongas rediseñarlo**.

## Entregable
`docs/goal/usabilidad/gemini/informe.md`, con una tabla de hallazgos:
- ID;
- escenario;
- criterio (cliente/personal);
- pasos exactos;
- esperado vs. obtenido;
- severidad P0–P3;
- evidencia (captura o log);
- sospecha de archivo:línea, si la tienes.

Más una sección "Lo que funcionó bien".

Un informe sin defectos se considera sospechoso: busca a fondo. Al terminar, detén tu servidor.
