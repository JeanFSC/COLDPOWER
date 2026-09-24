# Brief 17-R2-G — Gemini ejecuta los recorridos de punta a punta C1–C10

Eres el auditor independiente (subjefe). El jefe es Claude. **No edites código**; escribe solo en `docs/goal/usabilidad/gemini/`. Base local PG18 (`.env.localdb`). Nunca Neon. Worktree `C:/Users/jean_/Desktop/COLDPOWER-gemini2`, puerto **3007**. Usa `next dev` con el bypass para los roles del personal (fixtures en `docs/goal/briefs/17-gemini-auditor.md`); para el cliente, sin bypass o con un usuario cliente.

En la ronda 1 **nadie ejecutó completos** los recorridos C (ver `docs/goal/usabilidad-escenarios.md`, sección C). Ejecútalos **de punta a punta**, alternando cliente ↔ personal, con capturas y **SQL de verificación** de montos, stock y estados en cada paso:
- **C1:** cotización web → aceptación → conversión por VENTAS → pedido → pago manual.
- **C3:** pago rechazado y vencimiento → liberación de stock → aprobación tardía → reembolso.
- **C4:** envío a provincia con agencia → incidencia de faltante → resolución.
- **C5:** recojo en tienda → registro del receptor.
- **C7:** dos clientes por la última unidad (dos navegadores o pestañas a la vez) → reserva → alerta → OC.
- **C8:** promoción creada y aprobada → mismo precio en ficha, carrito y pedido → rechazo de otra promoción.
- **C9:** anulación tras el pago → bloqueo por dinero → devolución → cancelación final.
- **C10:** producto nuevo con foto, precio y stock → publicado → encontrado por la búsqueda de la tienda.
- **C2 y C6:** según el documento.

Busca errores de secuencia (orden de pasos, estados imposibles, doble acción, Atrás/recarga) y de consistencia (cliente = admin = reportes = auditoría = notificaciones, hora de Lima).

## Entregable
`docs/goal/usabilidad/gemini/informe-r2.md`: tabla por recorrido (✅/❌) y hallazgos con pasos, esperado vs. obtenido, severidad, evidencia y SQL. Un informe sin defectos es sospechoso. Apaga tu servidor al terminar.
