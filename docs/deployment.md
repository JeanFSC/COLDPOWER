# Despliegue ColdPower

## Requisitos

- Node.js compatible con Next.js 16.
- pnpm instalado.
- Variables de entorno configuradas según `.env.example`.
- Datos comerciales reales validados antes de publicar.

## Comandos

```bash
pnpm install
pnpm lint
pnpm build
pnpm start
```

## Variables de entorno

Configurar en el proveedor de hosting:

```bash
NEXT_PUBLIC_SITE_URL=https://coldpower.pe
NEXT_PUBLIC_COMPANY_NAME=ColdPower
NEXT_PUBLIC_WHATSAPP_NUMBER=51999999999
NEXT_PUBLIC_CONTACT_EMAIL=ventas@coldpower.pe
NEXT_PUBLIC_CONTACT_PHONE=+51 999 999 999
NEXT_PUBLIC_RUC=00000000000
QUOTE_RATE_LIMIT_MAX=5
QUOTE_RATE_LIMIT_WINDOW_MS=600000
QUOTE_ENABLE_API_LOG=true
```

No subir `.env.local` con datos reales al repositorio.

## Hosting recomendado

Vercel es la opción más directa para esta V1 por compatibilidad con Next.js App Router, rutas dinámicas, metadata, sitemap y API routes.

## Checklist antes de publicar

- Reemplazar WhatsApp real.
- Reemplazar correo comercial real.
- Reemplazar RUC real.
- Confirmar dirección y sedes.
- Confirmar redes sociales.
- Revisar productos, stock y precios.
- Revisar textos legales y políticas.
- Ejecutar `pnpm lint`.
- Ejecutar `pnpm build`.
- Probar cotización válida e inválida.

## Preview privado vs Producción

| Aspecto | Preview privado | Producción |
| --- | --- | --- |
| Datos placeholder | Permitidos | **Prohibidos** (datos reales obligatorios) |
| `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA` | `true` | `false` |
| `NEXT_PUBLIC_IS_PREVIEW` | `true` | `false` |
| Banner de preview | Visible | Oculto |
| Dominio | URL de Vercel (no final) | Dominio real |
| WhatsApp / RUC / correo | Placeholder de prueba | Reales |
| Redes sociales | Vacías (no se muestran) | Reales o vacías |
| Políticas legales | Pueden faltar | Reales y validadas |
| Compartir URL | No (privado) | Sí (público) |

En producción, con `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false`, si quedan datos
placeholder críticos el build falla de forma controlada (`assertCompanyDataReady()` en `src/lib/env.ts`).

## Datos reales obligatorios antes de producción

Antes de un deploy de producción real, todos estos datos deben ser reales y validados.
Mientras sigan en placeholder, el deploy de producción debe quedar bloqueado
(`NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false`).

- WhatsApp real (`NEXT_PUBLIC_WHATSAPP_NUMBER`).
- Correo comercial real (`NEXT_PUBLIC_CONTACT_EMAIL`).
- Teléfono real (`NEXT_PUBLIC_CONTACT_PHONE`).
- RUC real (`NEXT_PUBLIC_RUC`).
- Dirección/sede real (`src/data/branches.ts`).
- Redes sociales reales (`NEXT_PUBLIC_SOCIAL_*`) o no mostrarlas (dejar vacías).
- Dominio real (`NEXT_PUBLIC_SITE_URL`).
- Políticas legales reales (privacidad, términos).
- Libro de reclamaciones validado legalmente.

### Protección automática de placeholders

- En desarrollo/preview se permiten placeholders (`NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=true`).
- En producción, establece `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false`:
  si quedan datos placeholder críticos, el build/arranque falla de forma controlada
  (ver `assertCompanyDataReady()` en `src/lib/env.ts`).

## Limitaciones actuales

- El almacenamiento de multimedia local (	mp/media) es válido para localhost, pero no para varias instancias en producción.
- El rate limiting público usa memoria del proceso; debe migrarse a Redis/Valkey antes de escalar horizontalmente.
- El checkout no habilita un proveedor externo hasta configurar y probar credenciales reales; el pago manual autorizado permanece disponible.
- No se inventan datos comerciales: empresa, locales, stock, precios, roles y políticas deben validarse antes del release.
- El correo transaccional y las integraciones externas quedan pendientes de sus credenciales y proveedor reales.

## CP-027: condiciones antes de producción

- En localhost, `tmp/media` es el almacenamiento persistente de desarrollo para multimedia. Antes de desplegar varias instancias en Hetzner, migrar el adaptador a un volumen persistente compartido o R2/S3 compatible y conservar la misma interfaz de storage.
- El rate limiting público actual es por proceso y memoria. Antes de exponer varias instancias o un balanceador, reemplazarlo por un almacén compartido (Redis/Valkey o proveedor equivalente) y validar los límites de cotización y WhatsApp.
- No habilitar checkout de proveedor hasta configurar y probar un proveedor real; el flujo actual mantiene pago pendiente y permite confirmación manual autorizada.
- Registrar datos legales, locales, stock, precios y roles reales antes del primer release; el sistema no crea datos operativos de ejemplo.