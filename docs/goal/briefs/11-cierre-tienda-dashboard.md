# Brief 11 — Cierre tienda + Inicio/Dashboard + CMS (Codex)

Lee completos `AGENTS.md`, `docs/goal/GOAL-IMPECABLE.md` y `docs/goal/usabilidad-escenarios.md`. Rama `codex/goal-impecable`. Trabajas solo (no hay tareas paralelas).

**El home NO se rediseña** (Jean lo rechazó y se restauró desde git). `src/app/page.tsx` y `src/components/home/*` solo admiten correcciones puntuales justificadas.

## 1. `test-all` verde de punta a punta
- 4 contratos fallan porque esperan el home rediseñado y rechazado: `public UI contract follows the approved storefront anatomy`, `home hero uses the generated responsive technical image and search CTA`, `home prioriza búsqueda real y no conserva copy decorativo`, `tarjetas muestran identidad comercial y una sola CTA`. Ajusta esos contratos al home **actual**, sin cambiar el home para satisfacerlos. Conserva lo que sigue siendo válido (búsqueda real, una CTA por tarjeta, nada de copy inventado).
- Después corre `node scripts/test-all.mjs` completo y corrige cualquier fallo real que aparezca más adelante en la suite. El único fallo aceptable es el Excel externo ausente (`test:inventory`); repórtalo.

## 2. Tarjeta de producto del catálogo (`/catalogo`, 1920×1080)
Defectos vistos en navegador:
- El botón "Comparar" tapa la etiqueta de disponibilidad ("BAJO CONSULTA") en la esquina superior de la imagen.
- El texto "Cotizar" aparece como línea de precio justo encima del botón "Cotizar", duplicado. Si no hay precio, muestra un indicador honesto no redundante (p. ej. "Precio bajo cotización"), o nada, según el contrato de tarjeta.

Diseña primero la corrección (captura/boceto de la tarjeta corregida) y luego implementa. Revisa las mismas tarjetas en el home, la búsqueda y los relacionados. Valida a 1920 y 390.

## 3. Imágenes (genéralas tú con tu herramienta de imágenes)
- Mismo estilo que `public/images/info/*.webp` y `public/images/products/placeholder-*.webp`.
- Faltan:
  - asesor de mostrador atendiendo a un técnico (contacto/asistencia);
  - despacho/envío de repuestos (seguimiento de pedido, checkout o envíos);
  - ilustración para la página 404/no encontrado.
- Úsalas donde hoy hay bloques de solo texto o bandas planas, fuera del home.
- Revisa también si `public/images/home/placa-equipo.webp` y `public/images/info/nosotros-almacen.webp` están en uso; si no, colócalas donde aporten (búsqueda por código de placa, nosotros).
- WebP optimizado (< 250 KB), `next/image` con `sizes`, alt descriptivo y el chip "Imagen referencial" donde represente producto.

## 4. Inicio / Dashboard admin — auditar y corregir
- Escribe `docs/goal/audits/inicio-dashboard.md` con el formato §5: `/admin` y el landing por rol, métricas del dashboard, enlaces a cada módulo y datos reales.
- Cierra sus P0/P1/P2.

## 5. CMS — evaluación
- Evalúa `/admin/cms`: editor, media, slots, revisiones, publicación y efecto real en la tienda.
- Si queda completo y probado de punta a punta, desocúltalo:
  - `src/lib/hidden-admin-modules.ts`;
  - el redirect en `src/app/admin/cms/page.tsx`;
  - el filtro en `admin-workspace-service.ts`.
- Si no queda completo, sigue oculto. En ambos casos, reporta qué falta.

## Verificación
- Sin commit. Tests con `--test-timeout=60000`. Aborta comandos de más de 3 min.
- Migraciones: genéralas, no las apliques.
- Al final:
  - `tsc`;
  - `corepack pnpm lint` con 0 errores;
  - `node scripts/test-all.mjs` completo;
  - `corepack pnpm build`.
- Validación visual en el navegador autenticado de Jean, a 1920×1080 y 390.
- Reporta:
  - hallazgos cerrados;
  - imágenes creadas y dónde se usan;
  - estado del CMS;
  - archivos cambiados;
  - riesgos.
