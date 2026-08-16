# ColdPower v1.0 RC1 — auditoría backend, datos y release

Fecha de cierre: 15 de agosto de 2026 (America/Lima)
Rama objetivo: `release/coldpower-v1.0-rc1`
Entornos verificados: `http://localhost:3000` y `https://dev.coldpower.pe`
Alcance: consolidación, backend, datos, lógica, contratos, auth/RBAC y QA. No se rediseñó la UI ni se modificó Cloudflare, DNS, túnel o secretos.

## Resultado ejecutivo

La aplicación compila, el esquema está migrado, el inventario fuente está íntegro y los contratos backend pasan. La única corrección nueva de esta consolidación preserva `reviewReason` importado cuando se aprueba editorialmente una referencia; antes la aprobación lo borraba y rompía la reconciliación contra el Excel.

El estado de negocio sigue siendo deliberadamente de QA: 1,348 productos importados, 4 publicados como piloto, sin precios, locales, stock ni transacciones comerciales reales. No se auto-publicaron las 1,344 referencias restantes ni se inventaron cuentas Clerk.

## Git y conservación de cambios

- Se auditó la rama compartida, su remoto, commits, diferencias con `origin/main`, cambios indexados/no indexados, stash y ramas remotas.
- La rama de trabajo estaba sincronizada con su remoto y contenía los cambios integrados de los agentes; no había cambios trackeados ajenos que descartar.
- `tmp/` contiene logs/perfiles/artefactos locales y queda ignorado por seguridad; no se borró ni se incorporó al release.
- La rama release se creará desde el estado verificado, sin `reset --hard`, `checkout` destructivo, `push --force` ni eliminación de trabajo.

## Datos y PostgreSQL

| Verificación | Resultado |
|---|---:|
| Productos fuente / almacenados | 1,348 / 1,348 |
| SKU únicos / duplicados | 1,348 / 0 |
| Categorías / familias / marcas | 27 / 171 / 60 |
| Publicados / en revisión | 4 / 1,344 |
| Diferencias fuente vs DB | 0 |
| Locales / saldos / movimientos / reservas | 0 / 0 / 0 / 0 |
| Precios operativos cargados | 0 |
| Clientes / oportunidades / cotizaciones | 0 / 0 / 0 |
| Ventas / pedidos / compras / pagos | 0 / 0 / 0 / 0 |
| Usuarios `SUPERADMIN` activos | 1 |

Las cuatro referencias publicadas son `CP-REF-MCP-0995`, `CP-REF-VEN-0844`, `CP-REF-CAP-0412` y `CP-REF-TAR-0810`. La referencia `CP-REF-OTR-0435` permanece en revisión con razón `Descripción insuficiente` y no aparece públicamente.

Migraciones: 33 archivos en `drizzle/`, 33 entradas en el journal y 33 migraciones registradas en la base. `drizzle-kit check` pasó y `pnpm db:migrate` terminó correctamente sin cambios de esquema pendientes.

## Backend, contratos y seguridad

- Ruta canónica Clerk: `POST /api/webhooks/clerk`.
- La firma se valida exclusivamente con `CLERK_WEBHOOK_SECRET` leído desde entorno; no hay secreto alternativo ni hostname embebido en la lógica del webhook.
- `user.created`, `user.updated`, `user.deleted`, reintentos, concurrencia y eventos fuera de orden están cubiertos por idempotencia, tombstone y auditoría.
- Middleware y APIs exigen el rol persistido activo; cambiar claims, query strings o payloads no eleva permisos.
- Se conservaron sin cambios los campos del dashboard: `salesSeries`, `previousSalesSeries`, `pipelineSummary`, `userSummary`, `recentActivity` y `unknownStock`.
- `NEXT_PUBLIC_SITE_URL` es configurable; el proxy conserva el origen local y elimina el puerto `3000` al reconstruir el origen público `dev.coldpower.pe`.
- Las respuestas públicas no exponen precios internos, stock sensible ni clientes.

## Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `pnpm test:all` | PASS, código 0 |
| TypeScript incluido en `test:all` | PASS |
| ESLint incluido en `test:all` | 0 errores, 17 warnings preexistentes |
| Build Next.js incluido en `test:all` | PASS |
| `pnpm test:cp031:runtime` | 3/3 PASS |
| Runtime CP-033 a CP-049 | 25/25 PASS |
| `pnpm test:cp050:runtime` | 3/3 PASS |
| `pnpm qa:inventory-data` | PASS, mismatch 0 |
| `pnpm qa:inventory-db` | PASS |
| `pnpm qa:cp025` | PASS, 4 publicados y 1,344 en revisión |
| `pnpm exec drizzle-kit check` | PASS |
| `pnpm db:migrate` | PASS, idempotente |
| `api-contract-sync` | 2/2 PASS |
| Contratos RBAC reales del repositorio | PASS en `test:all`, CP-028/CP-031/CP-044/CP-050 |

El wrapper genérico `rbac-audit` no es compatible con esta estructura: busca `apps/web/...`, pero ColdPower es una aplicación Next en la raíz. Reportó 1/6 por rutas inexistentes, no por un fallo del código ColdPower. El wrapper genérico de regresión tampoco aplica porque espera `scripts/run-regression.mjs`; la regresión equivalente del proyecto es `pnpm test:all`.

## Smoke HTTP

| Ruta/prueba | Local | Público dev |
|---|---:|---:|
| `/` | 200 | 200 |
| `/catalogo` | 200 | 200 |
| `/buscar?query=CP-REF` | 200 | 200 |
| `/categoria/refrigeracion` | 200 | 200 |
| `/cotizacion` | 200 | 200 |
| `/sign-in` y `/sign-up` | 200 / 200 | 200 / 200 |
| `/api/health` | 200 | 200 |
| `/api/catalog/products` con 4 IDs publicados | 200, 4 productos | 200, 4 productos |
| SKU no publicado `CP-REF-OTR-0435` | 200, 0 productos | 200, 0 productos |
| `/dashboard` sin sesión | 307 a landing Clerk | 307 a landing Clerk |
| `/admin/dashboard` sin sesión | 307 a sign-in | 307 a sign-in |
| `/api/admin/dashboard` sin sesión | 403 | 403 |
| webhook sin headers Svix | 400 | 400 |

El webhook runtime validó además firma correcta, firma incorrecta `400`, payload inválido `400`, `user.created` `200`, reintento idempotente `200`, concurrencia `200/202`, actualización `200`, eliminación `200` y eliminación fuera de orden conservando `INACTIVE`.

## Handoff a Codex 1 / UI

No se modificó UI en este release. El frontend puede consumir los contratos actuales sin renombrar campos. Estados que debe representar de forma distinta: sin datos, no publicado, pendiente de conexión y sin permiso.

Observaciones visuales funcionales, no corregidas aquí:

1. El catálogo público puede verse escaso porque solo 4 referencias tienen publicación editorial y ninguna tiene precio o media real todavía; es un estado de datos, no un fallback para publicar todo.
2. Compras/proveedores, inventario, precios, CRM y reportes mostrarán estados vacíos porque no existen registros reales en QA.
3. Hay 17 warnings de lint, incluidos imports sin uso y una dependencia de `useEffect`; no son errores de build, pero conviene limpiarlos en una pasada UI/código separada.

## Pendientes y límites honestos

- Falta cargar precios, medios, locales, stock y fixtures comerciales antes de declarar producción operativa.
- Solo existe una cuenta Clerk persistida (`SUPERADMIN`). La matriz de roles se probó por servicio/contrato; no se fabricaron cuentas Gerencia, Operaciones/Ventas o Almacén sin identidades Clerk reales.
- El flujo completo cotización → venta → pedido → pago no puede demostrarse con datos reales mientras esas tablas estén vacías; los contratos y pruebas transaccionales aisladas pasan.
- Libro de reclamaciones: pendiente de aprobación legal, retención, adjuntos y E2E del responsable.
- La configuración de producción, claves production de Clerk y el despliegue oficial quedan fuera de este RC local/dev.

## Archivos modificados en esta consolidación

- `src/lib/publication-service.ts`
- `scripts/cp050-publication.test.ts`
- `scripts/cp044-users.test.ts`
- `.gitignore`
- `docs/contracts/cp050-qa-fixtures.md`
- `docs/qa/release-coldpower-v1.0-rc1-2026-08-15.md`
- `docs/superpowers/plans/2026-08-15-coldpower-v1-0-rc1-consolidation.md`

No se modificaron secretos, `.env.local`, Cloudflare, DNS ni túneles.
