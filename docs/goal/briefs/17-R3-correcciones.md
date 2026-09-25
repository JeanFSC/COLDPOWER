# Brief 17-R3 — Correcciones verificadas por Claude (Codex)

Protocolo obligatorio: `docs/goal/ORQUESTACION.md` (léelo primero). Rama `codex/goal-impecable`, carpeta principal `C:\Users\jean_\Desktop\COLDPOWER`.

## Entorno exacto
- **Base:** PostgreSQL 18 local, `127.0.0.1:5433`, con `.env.localdb`.
  - psql: `C:\PostgreSQL\18\bin\psql.exe -h 127.0.0.1 -p 5433 -U coldpower -d coldpower` (contraseña en `.env.localdb`).
  - **Nunca** uses `.env.local` ni Neon. No toques `.env.local` ni `proxy.ts`.
- **Servidor QA con rol:**
  ```
  corepack pnpm exec dotenv -e .env.localdb -v CP_DEV_AUTH_BYPASS=true -v CP_DEV_AUTH_USER_ID=<fixture> -v CP_DEV_AUTH_ALLOWED_HOSTS=localhost:3003 -- next dev --port 3003 --webpack
  ```
  - Navega **siempre** a `http://localhost:3003` (con `127.0.0.1` el bypass no aplica y Clerk da 500 `dev-browser-missing`).
  - Para cambiar de rol, reinicia con otro `CP_DEV_AUTH_USER_ID`. Los fixtures están en `docs/goal/briefs/17-gemini-auditor.md`.
- **Playwright:** usa el `chromium` de `node_modules` (`import { chromium } from "playwright"`, `headless: true`). Scripts en `scripts/qa/r3-*.mjs`: **créalos**.
  - Cada paso lleva: `page.goto` / `click` / `fill` → captura en `docs/goal/evidencia/17r3/` → consulta SQL de verificación.
- **Tablas reales:**
  - compras: `purchases`, `purchase_items`, `purchase_requests`… (lee `src/db/purchases-schema.ts`);
  - pagos: `payments`, `payment_events`, `payment_attempts`, `payment_status_history`, `payment_refunds`;
  - ventas: `src/db/sales-schema.ts`.
  **Lee el esquema antes de escribir SQL.**

## Correcciones (en este orden)

### 1. P1 — Pagos: aprobación tardía descartada en silencio (confirmado por Claude)
- **Dónde:** `src/lib/payment-service.ts:212-254` + `canTransitionPayment` en `src/lib/payments-contract.ts:93`.
- **Hoy:** si el pago está `REJECTED`, `ERROR` o `CANCELLED` (con el pedido **no** cancelado) y llega un webhook `CONFIRMED`, se devuelve `ignored: true`. El proveedor cobró, pero el sistema no lo registra ni avisa.
- **Regla nueva:** un `CONFIRMED` del proveedor **nunca se ignora**.
  - (a) Si el pedido sigue esperando pago y no tiene otro pago confirmado: se confirma normalmente (`markOrderPaid`).
  - (b) Si el pedido ya está pagado por otro intento, o está cancelado: el pago pasa a `CONFIRMED` con `requiresRefund: true`, `lateApproval: true`, historial, auditoría y `notifyStaffOnce` hacia la cola de reembolsos (igual que el caso existente de la línea 222).
- **Idempotencia:** el mismo `providerEventId` sigue siendo duplicado.
- **Pruebas de comportamiento:** REJECTED→CONFIRMED, ERROR→CONFIRMED, CANCELLED→CONFIRMED con el pedido activo sin otro pago, y CANCELLED→CONFIRMED con el pedido ya pagado (cobro doble → reembolso).

### 2. P1 — Formularios de compras que se rompen (encontrado por Codex QA por UI)
- `src/components/admin/PurchasesOperations.tsx:1360`: al escribir la cantidad de recepción → `TypeError: Cannot read properties of null (reading 'value')`.
- `src/components/admin/PurchaseRequestActions.tsx:249`: al editar el costo unitario, igual.
- **Causa típica:** leer `event.currentTarget.value` dentro del callback de `setState`. Hay que leer el valor **antes** (`const value = event.currentTarget.value;`).
- **Busca el mismo patrón en todo `src/`** (`rg "setState\(.*currentTarget|currentTarget\.value" -n`) y corrígelo donde aplique.
- Repite por UI: B3.3 (recepción parcial por líneas) y B4.1 (solicitud → OC con costos).

### 3. P2 — IGV visible al cliente como "Por configurar"
- **Dónde:** `src/lib/tax.ts`, `CheckoutForm.tsx:252-253`, `cuenta/pedidos/[code]/page.tsx:133-134` y `OrdersControlCenter.tsx:836`.
- **Regla:**
  - Si el impuesto no está configurado, el **cliente no ve** las filas "Op. gravada / IGV" (solo el Total).
  - El **admin** ve un aviso: "Configura el IGV en Configuración", con enlace.
- Agrega en `/admin/configuracion` (solo SUPERADMIN, con auditoría):
  - tasa (vacía por defecto; sugerencia 18);
  - modalidad: precios con IGV incluido / sin incluir.
  - **No los configures tú**: la decisión es de Jean.
- Prueba: sin configurar → el checkout no muestra las filas; con 18% incluido → desglose correcto.

### 4. P2 — La validación de RUC bloquea a clientes antiguos
- **Dónde:** `src/lib/crm-validation.ts` y `company-settings-validation.ts`.
- **Hoy:** la validación módulo 11 se aplica a toda edición. 53 de los 58 RUC guardados en local no la pasan, así que editar cualquier campo de esos clientes falla.
- **Regla:**
  - Validar el dígito verificador **solo si el RUC es nuevo o cambió**.
  - Los antiguos inválidos se marcan "RUC por verificar" (badge en la ficha 360 del cliente) y **no bloquean** otras ediciones.
  - Al convertir a venta con comprobante, se exige un RUC válido o se ofrece corregirlo.
- Prueba con un cliente antiguo de RUC inválido: editar el nombre funciona; cambiar el RUC por uno inválido falla.

### 5. P1 — Rendimiento móvil
- **Hoy:** LCP móvil 4,8 s (meta < 2,0 s; mínimo aceptable 2,5 s).
- **Mide solo** con `next build && next start --port 3003` y **sin otros agentes corriendo** (verifícalo: `Get-Process codex,agy`). Lighthouse móvil en home, catálogo y ficha.
- Ataca en este orden: tamaño y formato real de la imagen LCP en móvil (`hero-mobile.webp`, `sizes` correcto), fuentes (preload, `display: swap`), JS de cliente del header y de las tabs, y terceros (Clerk) diferidos.
- Documenta antes/después en `docs/goal/usabilidad/rendimiento.md`.

### 6. Validación con sesión iniciada
Con el comando exacto de arriba (`localhost`), valida por UI con capturas:
- `/admin/pedidos` como ALMACEN → sin montos; como VENTAS → con montos;
- cotización mínima (nombre + teléfono) desde la tienda;
- WhatsApp oculto sin número configurado.

(Los hallazgos adicionales del QA de personal (Codex 2) se agregan abajo cuando Claude los verifique.)

## Terminado =
- Cada punto con prueba de comportamiento y evidencia (captura y SQL) en `docs/goal/evidencia/17r3/`.
- `tsc`, lint 0/0, `test-all` (solo el Excel externo) y build.
- Informe breve por número.
- Sin commit.
