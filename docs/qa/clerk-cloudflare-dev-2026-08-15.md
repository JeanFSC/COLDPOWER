# QA de Cloudflare Tunnel + Clerk en desarrollo

Fecha: 2026-08-15  
Orígenes probados: `http://localhost:3000` y `https://dev.coldpower.pe`  
Ruta canónica: `POST /api/webhooks/clerk`

## Resultado

La aplicación sirve el mismo código y la misma base PostgreSQL en ambos hostnames. Se encontró y corrigió una diferencia de hidratación en el hostname público: faltaba declarar `dev.coldpower.pe` como origen permitido de Next en desarrollo.

Después de añadir `allowedDevOrigins: ["dev.coldpower.pe"]`, Clerk carga correctamente en ambos orígenes.

## Verificaciones

| Prueba | localhost | dev.coldpower.pe |
|---|---:|---:|
| GET `/` | 200 | 200 |
| GET `/api/health` | 200 JSON | 200 JSON |
| Página `/sign-in` | Clerk visible | Clerk visible |
| Página `/sign-up` | Clerk visible | Clerk visible |
| `Clerk.loaded` | `true` | `true` |
| Redirección admin sin sesión | preserva `localhost` | preserva `dev.coldpower.pe` |
| CORS abierto | no | no |
| Cabecera CSRF custom | no | no |

El fallo inicial en `dev.coldpower.pe` era: `Clerk.loaded=false`, componente Clerk ausente y errores HMR 502. Tras la allowlist de Next: componente visible y consola sin errores funcionales.

## Webhook Clerk

La firma usa exclusivamente `authConfig.webhookSecret`, cuyo origen es `CLERK_WEBHOOK_SECRET` en `src/lib/env.ts`. No existe el hostname `dev.coldpower.pe` dentro de la lógica del webhook.

Se enviaron eventos Svix firmados con el secreto real, sin imprimirlo:

| Evento/prueba | Origen | Resultado |
|---|---|---:|
| `user.created` | localhost | HTTP 200 |
| Reintento del mismo evento | dev | HTTP 200, idempotente |
| `user.updated` + cambio de rol | dev | HTTP 200, rol sincronizado en PostgreSQL |
| `user.deleted` | localhost | HTTP 200, usuario marcado `INACTIVE` |
| Firma incorrecta | dev | HTTP 400, rechazo controlado |
| Payload inválido | localhost | HTTP 400, rechazo controlado |

La prueba de creación dejó exactamente un registro; el reintento no creó duplicados. Los usuarios y eventos sintéticos fueron retirados al finalizar. Las entradas de auditoría se conservaron porque la tabla es append-only.

También se corrigieron dos fallos reales:

- `user.deleted` usaba `getDb().transaction()`, incompatible con el driver Neon HTTP. Ahora usa una sentencia SQL atómica compatible y conserva el bloqueo de seguridad del último SUPERADMIN.
- Un payload firmado pero inválido podía terminar en HTTP 500. Ahora se valida antes de persistir y responde HTTP 400.
- La sincronización de roles desde `public_metadata.role` tenía el mismo problema de transacciones; ahora funciona con SQL atómico y auditoría.

## Sesiones, cookies y hostname

Los orígenes no comparten cookies ni `localStorage`, lo cual es esperado y evita mezclar sesiones. Los nombres de cookies de Clerk son equivalentes, pero su dominio cambia entre `localhost` y `dev.coldpower.pe`.

No se encontró lógica de negocio condicionada por `location.hostname`, `Origin` o `Host`. `NEXT_PUBLIC_SITE_URL` continúa usando el dominio oficial para metadata, sitemap y canonical; no se cambió porque sustituirlo por el hostname dev rompería la identidad pública del sitio.

La sesión existente de localhost no se reutilizó en dev: para comprobar un login real en `dev.coldpower.pe` se necesita iniciar sesión allí de forma independiente. La pantalla, Clerk y los redirects están operativos en ambos orígenes.

## Archivos modificados

- `next.config.ts`
- `src/app/api/webhooks/clerk/route.ts`
- `src/lib/user-administration.ts`
- `scripts/cp044-users.test.ts`
- `scripts/proxy-auth-return-url.test.mjs`

No se modificaron Cloudflare, DNS, el túnel ni secretos. No se hizo commit ni push.

## Verificación final

- `pnpm test:all`: PASS.
- TypeScript: PASS.
- Build de producción: PASS.
- Contrato de usuarios/webhook: PASS.
- Redirect por hostname: PASS.
- `git diff --check`: sin errores de formato; solo avisos preexistentes de finales de línea.
- Lint: 0 errores y 17 warnings preexistentes no bloqueantes.
