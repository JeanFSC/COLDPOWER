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

- La cotización no persiste.
- El rate limit es en memoria y no es suficiente para serverless distribuido.
- No hay CMS.
- No hay panel administrativo.
- No hay pagos.
- No hay email transaccional real.
