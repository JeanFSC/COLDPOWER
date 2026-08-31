# CP-029 — Diseño de verificación y corrección backend-only

Fecha: 2026-08-15
Base inmutable: `release/coldpower-v1.0-rc1`
SHA base: `bf572060ff2efade5ea0fbaec7542f97d12da1c5`
Rama de trabajo: `fix/cp029-be-blockers`

## Alcance

Diagnosticar y cerrar blockers de backend, PostgreSQL, autenticación Clerk y RBAC de CP-029. No se modificarán componentes, páginas ni estilos frontend; tampoco se crearán datos de negocio, productos, inventario, precios, ventas, clientes, pedidos, cotizaciones, pagos o proveedores.

## Evidencia inicial

La consulta SQL directa contra la base configurada en `.env.local` confirmó:

- 1,348 productos y 1,348 SKU únicos.
- `published`: 4; `review`: 1,344; `draft`, `hidden` y `archived`: 0.
- `requires_review = true`: 57.
- Posibles duplicados pendientes: 62; grupos de SKU exactos duplicados: 0.

El servicio `getAdminCatalogPage` y `GET /api/admin/catalogo` ya calculan las colas globales sin paginación: 1,348 total, 4 publicados, 1,344 en revisión y 62 duplicados pendientes. La primera página de 48 filas contiene 0 publicados, 48 en revisión y 2 posibles duplicados. La diferencia observada en `/admin/catalogo` proviene de que `ProductWorkspace` calcula sus tarjetas con la página actual; ese componente pertenece al frontend y queda fuera de este ticket.

## Diseño de trabajo

1. Repetir la conciliación SQL y la respuesta del servicio/API, registrando la consulta, filtros, destino lógico de la base y ausencia de mocks, seeds o constantes.
2. Verificar con la sesión Clerk real de `xslync@gmail.com` el dashboard, catálogo, rutas administrativas, middleware, guardas de servidor y persistencia de `SUPERADMIN` después de logout/login. Si aparece OTP/MFA, se solicitará el código sin intentar evadirlo.
3. Validar RBAC positivo y negativo con las pruebas existentes y runtime. Se conservará el contrato actual: rutas de cuenta sin sesión devuelven `401`; APIs administrativas sin sesión o sin permiso devuelven `403` con error de dominio, según los contratos CP-030/CP-050.
4. Revalidar `POST /api/webhooks/clerk` con firma válida e inválida, payload inválido, idempotencia y orden de eventos. La firma seguirá dependiendo únicamente de `CLERK_WEBHOOK_SECRET`; no se añadirá ningún dominio hardcodeado.
5. Ejecutar pruebas de regresión backend. Solo se modificará código backend si una prueba demuestra que la respuesta persistida/API es incorrecta; si la API permanece correcta, el reporte dejará explícito el handoff a Codex1 sin tocar UI.
6. Ejecutar TypeScript, lint, build, suite CP-029 relevante, runtime local y `dev.coldpower.pe`; generar `docs/qa/cp029-be-blockers-2026-08-15.md` con resultados, archivos, raíz, bloqueos y SHA final.

## Alternativas descartadas

- Cambiar la UI para que muestre las colas globales: contradice el alcance de Codex2 y ocultaría que backend ya devuelve la verdad.
- Cambiar el API para devolver contadores de la primera página: produciría métricas incorrectas.
- Crear datos ficticios o un segundo SUPERADMIN para pasar QA: está prohibido y rompería la conciliación de identidad.

## Criterio de cierre

La rama fix queda lista solo cuando los valores backend representan PostgreSQL, Clerk y el usuario interno son consistentes, las rutas y RBAC rechazan accesos no permitidos, webhook y regresiones pasan, runtime local/dev funciona, el reporte existe, la rama se publica sin mergear RC1 y el árbol de trabajo queda limpio.
