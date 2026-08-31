# Deploy Preview Checklist

## Revisión previa a Vercel

- Ejecutar `pnpm lint`.
- Ejecutar `pnpm build`.
- Ejecutar tests de fase disponibles.
- Confirmar que `.env.example` esté actualizado.
- Revisar que no existan assets temporales ni capturas en el repositorio.

## Variables mínimas

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

## Comandos

```bash
pnpm install
pnpm lint
pnpm build
```

## Después del deploy

- Revisar Home, catálogo, producto, cotización, Nosotros y Contacto.
- Confirmar que el logo textual ColdPower se vea bien en desktop y mobile.
- Confirmar que las imágenes SVG fallback carguen correctamente.
- Revisar que el botón flotante de WhatsApp no tape CTAs importantes.

## Validar rutas

- `/`
- `/catalogo`
- `/producto/compresor-danfoss-nl11ft-1-4-hp`
- `/cotizacion`
- `/nosotros`
- `/contacto`
- `/libro-de-reclamaciones`

## Validar cotización

- Enviar una solicitud válida.
- Enviar una solicitud inválida y confirmar errores por campo.
- Probar exceso de solicitudes para confirmar respuesta `429`.
- Confirmar que no se simula pago ni compra.

## Revisar robots y sitemap

- Abrir `/robots.txt`.
- Abrir `/sitemap.xml`.
- Confirmar dominio configurado mediante `NEXT_PUBLIC_SITE_URL`.

## Deploy preview privado en Vercel (paso a paso)

> Objetivo: preview privado/controlado con placeholders permitidos. NO es producción.

1. Crear proyecto en Vercel importando el repositorio desde GitHub.
2. Framework Preset: **Next.js** (autodetectado).
3. Install Command: `pnpm install`.
4. Build Command: `pnpm build`.
5. Output Directory: **default de Next.js** (no cambiar).
6. Variables de entorno (scope **Preview**), usar los valores de `.env.preview.example`:
   - `NEXT_PUBLIC_SITE_URL` = URL preview de Vercel (no el dominio final).
   - `NEXT_PUBLIC_COMPANY_NAME=ColdPower`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_RUC` (placeholder de prueba).
   - `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=true`
   - `NEXT_PUBLIC_IS_PREVIEW=true`
   - `NEXT_PUBLIC_SOCIAL_FACEBOOK`, `NEXT_PUBLIC_SOCIAL_INSTAGRAM`, `NEXT_PUBLIC_SOCIAL_TIKTOK` (vacías).
   - `QUOTE_RATE_LIMIT_MAX=5`, `QUOTE_RATE_LIMIT_WINDOW_MS=600000`, `QUOTE_ENABLE_API_LOG=false`.
7. Lanzar el deploy y esperar a que termine el build.

### Verificación después del deploy preview

- Abrir y revisar que respondan: `/`, `/catalogo`, `/producto/compresor-danfoss-nl11ft-1-4-hp`, `/buscar?q=compresor`, `/cotizacion`, `/contacto`, `/robots.txt`, `/sitemap.xml`.
- Confirmar que aparece el **aviso de preview** ("Vista previa privada — datos comerciales de prueba").
- Enviar una cotización válida y confirmar respuesta `201` con `quoteId`.
- Confirmar que el CTA de WhatsApp abre con el número **placeholder** (esperado solo en preview privado).
- **No compartir públicamente** la URL del preview.

## Variables de protección de placeholders

```bash
# Preview privado intencional con datos aún mock:
NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=true
NEXT_PUBLIC_IS_PREVIEW=true

# Redes sociales: vacías => no se renderizan enlaces mock.
NEXT_PUBLIC_SOCIAL_FACEBOOK=
NEXT_PUBLIC_SOCIAL_INSTAGRAM=
NEXT_PUBLIC_SOCIAL_TIKTOK=
```

## Datos reales obligatorios antes de producción

A diferencia del preview, un deploy de producción real exige TODOS estos datos reales.
En producción, `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false`: si quedan placeholders
críticos, el build falla de forma controlada.

- WhatsApp real.
- Correo comercial real.
- Teléfono real.
- RUC real.
- Dirección/sede real.
- Redes sociales reales o no mostrarlas (dejar vacías).
- Dominio real.
- Políticas legales reales.
- Libro de reclamaciones validado.
- Productos, stock y precios reales.
- Imágenes WebP finales.
