# Brief 17-R3b — Revisión de código de Claude sobre la ronda 3 (orden a Codex)

Protocolo: `docs/goal/ORQUESTACION.md`. Mismo entorno que `17-R3-correcciones.md` (localhost:3003, PG18 5433, sin Neon, sin commit, no tocar `.env.local` ni `proxy.ts`).

## A. RECHAZADO: carga diferida de Clerk (`DeferredClerkProvider`)
Revierte por completo el enfoque diferido y vuelve a montar `ClerkProvider` **siempre** en `src/app/layout.tsx`, con las mismas props que tenía antes de R3.
- Elimina `src/components/auth/DeferredClerkProvider.tsx`.
- Revierte `useClerkRuntime` / `requestLoad` / `isReady` en `Header.tsx`, `MobileMenu.tsx`, `AdminShell.tsx` y `ClerkAuthPanel.tsx`.
- Revierte el cambio de `scripts/cp028-auth-flow-contract.test.mjs` para que vuelva a afirmar sobre `layout.tsx`.

**Motivos, verificados en el código:**
1. **Estado de sesión falso:** un cliente con sesión iniciada ve "Ingresar" en home, catálogo y carrito (`Header.tsx:32` devuelve `SignedOutAccountAction` si `!isReady`).
2. **Navegación rota:** `useState(requiresImmediateAuth)` solo se evalúa al montar. Si el usuario navega del home a `/cuenta` o `/admin` sin recargar, Clerk nunca se carga.
3. **Pérdida de datos:** al pasar de `children` a `<ClerkProvider>{children}</ClerkProvider>` cambia la estructura del árbol y React **remonta toda la página**. Basta con pasar el mouse por "Ingresar" para borrar un formulario a medio llenar. Es el mismo defecto que encontraste; solo lo hiciste menos frecuente.
4. **Sesión que caduca:** sin el cliente de Clerk, el token de sesión (unos 60 s) no se renueva en páginas públicas. Las llamadas `fetch` a `/api/carrito` o al checkout de un usuario con sesión pueden llegar como invitado o recibir 401.
5. **Beneficio insuficiente:** medido por ti, home 6,5 → 5,2 s; catálogo y ficha no mejoraron.

**Conserva** las mejoras de rendimiento que no tocan la sesión: `picture`/`srcset` del hero, variante móvil 390w, prioridad de la imagen LCP del catálogo, reserva de altura del main y sin preload de tarjetas.

El rendimiento se atacará en una tarea aparte (`proxy.ts` / TTFB), bajo revisión de Claude.

## B. Pagos: tres defectos en la nueva lógica de aprobación tardía
Archivos: `src/lib/payment-service.ts`, en los dos caminos (confirmación consultando al proveedor, ~línea 110, y webhook, ~línea 240).

1. **Falso "requiere reembolso" en una confirmación repetida.**
   - Hoy: si el pago **ya** está `CONFIRMED` y llega otro evento `CONFIRMED` con otro `providerEventId`, `canTransitionPayment(from===to)` da true, el pedido está `PAID` y se calcula `refundRequired = true`.
   - Consecuencia: se notifica a personal que reembolse un pago legítimo.
   - Corrección: `refundRequired` solo aplica cuando el pago **entra** a CONFIRMED desde un estado no confirmado (`payment.status` ∉ {CONFIRMED, APPROVED}). Una reconfirmación es no-op idempotente (`changed:false`), sin auditoría de reembolso ni notificación.
2. **Pagos parciales marcados como cobro doble.**
   - Hoy: `otherConfirmedPayment` = "existe otro pago confirmado". Pero `markOrderPaid` (línea 134-143) suma pagos parciales hasta cubrir el total, así que un segundo abono legítimo de un pedido `PAYMENT_PENDING` queda marcado para reembolso.
   - Corrección: el reembolso aplica si el pedido ya no está `PAYMENT_PENDING`, **o** si los pagos confirmados previos (neto de reembolsos, con `summarizePaymentLedger`, misma moneda) **ya cubrían** el total antes de este pago.
   - Si este pago cubre de más solo en parte (sobrepago parcial), aplica pero marca `requiresRefund` con `overpaidAmount` = exceso, sin tratar todo el pago como duplicado.
3. **Trazabilidad perdida en el caso sensible.** En la rama `refundRequired` del webhook se retorna **antes** de insertar `paymentAttempts` y `paymentStatusHistory`. La rama anterior sí los registraba. Registra ambos siempre (con `reason` = "Aprobación posterior: requiere reembolso").

**Pruebas de comportamiento** (`scripts/brief17-r3-payments.test.ts`, contra la base local):
- (a) CONFIRMED duplicado con otro eventId → sin flag ni notificación;
- (b) APPROVED → CONFIRMED del mismo pago con el pedido ya PAID por ese pago → sin flag;
- (c) dos abonos parciales que suman el total → pedido PAID, ninguno marcado;
- (d) pedido pagado por A y llega la aprobación tardía de B → B marcado, historial y attempt presentes;
- (e) pedido CANCELLED + aprobación tardía → marcado y notificado;
- (f) REJECTED → CONFIRMED con el pedido PAYMENT_PENDING → confirma normal y el pedido pasa a PAID.

## C. Verificación
- Vuelve a correr los scripts de UI afectados:
  - `scripts/qa/r3-1-payments.mjs`;
  - `b-2-3-payments.mjs`;
  - `b-1-1-quote.mjs` (sesión de cliente en páginas públicas);
  - un recorrido nuevo `r3-auth-navigation.mjs`: cliente con sesión en home → debe ver "Mi cuenta", no "Ingresar" → navega a `/cuenta` sin recargar → funciona; un formulario de cotización a medio llenar no se borra al pasar el mouse por el header.
- `tsc`, lint 0/0, `test-all` (solo el Excel externo) y build.
- Informe por letra. Sin commit.
