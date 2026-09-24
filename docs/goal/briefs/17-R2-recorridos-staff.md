# Brief 17-R2-B — Ejecutar DE VERDAD los recorridos del personal (Codex)

En la ronda 1, los escenarios B1–B7 quedaron como "cobertura pendiente": se llegó a las pantallas pero **no se ejecutaron las acciones**. Esta vez se ejecuta cada mutación completa en el navegador, como el usuario real, con evidencia.

Trabajas en un **worktree aislado** (`C:/Users/jean_/Desktop/COLDPOWER-wt17b`), puerto **3004**. Base local PG18 compartida (`.env.localdb`). Nunca Neon. **No corrijas código**: solo prueba y reporta (otra tarea está corrigiendo en paralelo). Puedes crear datos por la UI.

Usa `next dev` con el bypass de desarrollo para cambiar de rol (en `next start` el bypass está bloqueado a propósito, por seguridad). Fixtures en `docs/goal/briefs/17-gemini-auditor.md`. Automatiza con Playwright (scripts en `scripts/qa/b-*.mjs`) para que sea repetible.

## Qué ejecutar completo (cada uno con capturas antes/después y SQL de verificación)
- **B1.1:** solicitud web → notificación → precios → respuesta al cliente → conversión a venta/pedido.
- **B1.4 / B2.1:** descuento sobre el umbral → bloqueo → aprobación de GERENCIA desde la notificación → auditoría.
- **B2.3 / B5.1:** pago manual, conciliación, devolución y reembolso "por reembolsar", con idempotencia (doble clic real).
- **B3.3:** recepción parcial por líneas de una OC, con doble clic → Kardex correcto.
- **B3.4:** ajuste por conteo con motivo → Kardex y auditoría.
- **B4.1:** solicitud → OC con costos por línea → proveedor → estados.
- **B7.1:** invitación → cambio de rol → verificación de permisos → auditoría.
- **B7.2:** cambio de dato de empresa → restaurar la versión anterior.
- **B7.3:** producto con foto propia → publicar → verlo en la tienda → despublicar.

Para cada uno, intenta además **lo prohibido**: un rol sin permiso, por URL y por API directa.

## Entregable
- Actualiza `docs/goal/usabilidad/B-staff.md` en tu worktree: ✅/❌ real.
- Cada defecto lleva: pasos, esperado vs. obtenido, severidad, evidencia y archivo:línea.
- Sin commit. Apaga tu servidor al terminar.
