# CP-050 — Auditoría backend, datos y lógica

Fecha: 2026-08-15  
Entorno: `http://localhost:3000`, `https://dev.coldpower.pe`, PostgreSQL compartido  
Responsable: Codex 2

## Resultado ejecutivo

La columna vertebral backend queda verificada y estable para continuar con la UI. No se hizo commit, push, cambio de Cloudflare/DNS/túnel ni regeneración de secretos.

Se corrigieron cuatro fallos reales:

1. La aplicación usaba `neon-http`, que no soporta las transacciones Drizzle requeridas por inventario, CRM, compras, configuración y sincronización de roles. Se migró el adaptador central a `neon-serverless` con `Pool`.
2. El webhook de Clerk podía procesar dos reintentos simultáneos. Ahora reclama el evento atómicamente (`PROCESSING`), responde `202` al segundo intento concurrente y permite reintentar eventos fallidos o atascados después de cinco minutos.
3. `user.deleted` no desactivaba correctamente algunos usuarios cliente por una comparación SQL con `NULL`. Se corrigió y se conservó la protección del último SUPERADMIN.
4. Un `user.deleted` recibido antes de `user.created` podía dejar luego una cuenta activa. Ahora se crea un tombstone interno `INACTIVE` y la creación retrasada conserva esa condición sin duplicar el usuario.

También se añadió la ruta `/dashboard` como entrada compatible que deriva al landing post-login persistido, se incorporó `archived` al contrato editorial vigente y se expuso una proyección aditiva de estados de negocio:

`IMPORTED → IN_REVIEW → APPROVED → PUBLISHED → REJECTED → ARCHIVED`.

La proyección no duplica estados en la base: usa `publicationStatus` y `requiresReview`. Los campos del contrato del dashboard (`salesSeries`, `previousSalesSeries`, `pipelineSummary`, `userSummary`, `recentActivity`, `unknownStock`) no fueron renombrados ni modificados.

## Datos verificados

| Área | Resultado actual |
|---|---:|
| Productos importados | 1,348 |
| SKU únicos | 1,348 |
| SKU duplicados | 0 |
| Categorías | 27 |
| Familias | 171 |
| Marcas | 60 |
| Productos publicados | 0 |
| Productos en `review` | 1,348 |
| Posibles duplicados pendientes | 62 |
| Precios operativos | 0 cargados |
| Locales / saldos / movimientos | 0 / 0 / 0 |
| Usuarios | 1 SUPERADMIN activo |
| Clientes / oportunidades / cotizaciones / ventas / pedidos / pagos | 0 / 0 / 0 / 0 / 0 / 0 |
| Configuración empresarial persistida | 0; funciona fallback público controlado |

El catálogo importado coincide con el origen y pasa la reconciliación. Los 62 posibles duplicados siguen marcados como pendientes; no se ocultaron ni se fusionaron automáticamente. Las familias cumplen el índice único por categoría; no se ejecutó una deduplicación destructiva de nombres como “Otros” porque puede representar familias válidas en categorías distintas.

## Pruebas ejecutadas

### Contratos y regresión

- `pnpm test:all`: PASS.
- TypeScript: PASS.
- Build de producción Next.js: PASS; las rutas administrativas y API fueron generadas correctamente.
- ESLint: 0 errores; quedaron 17 advertencias preexistentes ajenas a esta auditoría.
- `git diff --check`: sin errores de formato; solo avisos de finales de línea de Windows.
- `pnpm test:cp050`: PASS.
- `node --test scripts/proxy-auth-return-url.test.mjs`: PASS.

### Runtime transaccional

Las 27 pruebas de runtime CP-031 y CP-033–CP-049 pasaron después del cambio de driver. Se verificaron dashboard, catálogo administrativo, precios, clientes, pipeline, cotizaciones, ventas, pedidos, compras, pagos, CMS/media, reportes, auditoría, usuarios, configuración, notificaciones, taxonomía, promociones y operaciones.

La prueba CP-050 creó datos aislados y los eliminó al finalizar; comprobó transacciones reales, apertura de saldo, reserva, liberación, CRM, proveedor, orden, recepción de compra, reintentos idempotentes y saldo final reconciliado.

### Clerk y orígenes

| Prueba | Resultado |
|---|---:|
| `GET /` local | 200 |
| `GET /` dev | 200 |
| `GET /api/health` local | 200 |
| `GET /api/health` dev | 200 |
| `GET /api/catalog/products` local/dev | 200 |
| `/dashboard` local/dev sin sesión | 307 a `/auth/after-sign-in` |
| `user.created` firmado | 200 |
| Reintento del mismo evento | 200 idempotente |
| Reintento concurrente | 200/202; una sola auditoría de procesamiento |
| `user.updated` firmado | 200 |
| `user.deleted` firmado | 200; usuario `INACTIVE` |
| `user.deleted` antes de `user.created` | 200; tombstone permanece `INACTIVE` |
| Firma incorrecta | 400 |
| Payload firmado inválido | 400 |

La ruta canónica sigue siendo `POST /api/webhooks/clerk`. La firma se valida únicamente con `CLERK_WEBHOOK_SECRET`; no hay hostname hardcodeado en el webhook. El retorno de Clerk conserva `localhost:3000` en local y elimina el puerto local cuando el origen público llega por `dev.coldpower.pe`.

## Archivos de esta ejecución

- `src/db/index.ts`
- `src/app/api/webhooks/clerk/route.ts`
- `src/proxy.ts`
- `src/app/dashboard/page.tsx`
- `src/lib/publication-governance.ts`
- `src/lib/catalog-admin-contract.ts`
- `src/lib/catalog-admin-service.ts`
- `src/lib/admin-catalog.ts`
- `src/types/product.ts`
- `package.json`
- pruebas CP-050 y contrato de retorno de Clerk

No se modificó la composición visual del dashboard ni de los módulos administrativos; esos cambios permanecen bajo responsabilidad de Codex 1.

## Pendientes honestos antes de producción

- No hay datos comerciales reales para demostrar una serie no trivial de ventas, conversión completa cotización→venta→pedido→pago ni reportes con margen. Las rutas y contratos pasan con base vacía y las pruebas usan datos temporales aislados.
- Los 1,348 productos están en revisión y ninguno se publica hasta completar la aprobación editorial, descripción, duplicados, precio y demás requisitos definidos por negocio.
- Faltan precios, inventario, locales, configuración empresarial y usuarios de QA persistentes para Gerencia/Ventas/Almacén. No se fabricaron cuentas Clerk ni datos de producción.
- El libro de reclamaciones no debe declararse listo sin validación legal y un flujo E2E con retención, adjuntos y responsable definido.
- La subida de imágenes cuenta con contrato/media backend, pero la carga de los activos reales queda pendiente de la fuente y almacenamiento definitivos.
- Las advertencias de lint restantes deben limpiarse en una pasada separada; no bloquean el build.

## Entrega a Codex 1

Mantener estables los contratos existentes del dashboard. Para el catálogo, usar `publicationStatus`, `requiresReview` y el nuevo campo aditivo `editorialWorkflowState` sin sustituir los nombres actuales. Representar de forma distinta `sin datos`, `no publicado`, `pendiente de conexión` y `sin permiso`; el backend ya devuelve 403/400/404/409/503 diferenciables según el caso.
