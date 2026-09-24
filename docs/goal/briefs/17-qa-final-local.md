# Brief 17 — Terminar la QA final (brief 12) sobre la base local (Codex)

Lee `docs/goal/briefs/12-qa-final.md` y `docs/goal/usabilidad-escenarios.md` completos. Base de datos **local** (`.env.localdb`). Nunca Neon. Rama `codex/goal-impecable`.

El brief 12 quedó a medias:
- solo existen las líneas base de axe en `docs/goal/usabilidad/capturas/`;
- se aplicaron correcciones parciales de accesibilidad;
- **no existe ningún informe**.

Desde entonces cambiaron el home (espejo) y el header y footer globales.

## Qué entregar (obligatorio)
Los 5 informes de `docs/goal/usabilidad/`:
- `A-tienda.md`
- `B-staff.md`
- `C-recorridos.md`
- `rendimiento.md`
- `accesibilidad.md`

Cada escenario de A1–A4, B1–B7 y C1–C10 lleva:
- ✅/❌;
- factores de la matriz D;
- severidad;
- **captura** en `docs/goal/usabilidad/capturas/`;
- archivo:línea del defecto.

## Cómo
- **Servidores QA por rol** con el bypass de desarrollo, apuntando a la base local. Un servidor por turno, en el puerto 3003; apágalo al terminar. El 3002 lo usa Claude.
- **Flujos completos:**
  - cotización → venta → pedido → pago mock → despacho → entrega;
  - compra web con login → pago mock → seguimiento.
- **Lighthouse** sobre `build && start` con `.env.localdb`: home, catálogo y ficha, escritorio y móvil. Tabla antes/después. Metas: LCP < 2,0 s, CLS < 0,05, Performance ≥ 90.
- **axe** en las mismas páginas y en los módulos admin. Tabla antes/después respecto a la línea base existente.
- Corrige todos los P0/P1 y los P2 de bajo riesgo, y repite el escenario afectado.
- El home no se rediseña: es el espejo aprobado. Solo arreglos de accesibilidad o rendimiento sin cambiar la composición.

## RIGOR EXTREMO (orden directa de Jean)
El objetivo es **encontrar errores**, no confirmar que funciona. Un informe sin defectos encontrados se considera sospechoso y se rehace.

Se prueba **todo** con los dos criterios de Jean:
- **Usuario normal (comprador):** técnico con prisa en el celular, taller en escritorio, empresa recurrente y visitante que duda. Cada uno intenta **completar su objetivo real** y también **usarlo mal**.
- **Usuario del sistema (personal):** ventas, operaciones de ventas, almacén, compras, caja/pagos, reportes, jefatura, gerencia, admin y superadmin. Cada uno hace **su jornada real completa** y también intenta **lo que no debería poder hacer**.

### Modo producción (obligatorio)
- Todo corre sobre `next build && next start` con `.env.localdb`, no sobre `next dev`.
- Registra y adjunta:
  - el log del servidor (errores, warnings, excepciones no manejadas, consultas lentas > 500 ms);
  - la consola del navegador;
  - la red (cualquier 4xx/5xx inesperado, requests duplicados, waterfalls).
- Cada error de consola o de servidor es un hallazgo.

### Errores de secuencia (probar explícitamente)
- **Montos:** cotización → venta → pedido → pago → despacho → entrega. En cada paso verifica que montos, impuestos, descuentos y promociones cuadren con el paso anterior y con la base de datos (consulta SQL de verificación adjunta).
- **Inventario:** reserva al pedir, liberación al cancelar, sin doble descuento, sin stock negativo y reservas coherentes tras pagar o expirar.
- **Transiciones ilegales:** entregar sin despachar, pagar un pedido cancelado, despachar sin pagar, reabrir cerrados y saltar estados vía API directa (no solo por la UI).
- **Idempotencia y concurrencia:**
  - doble clic en pagar, confirmar o convertir;
  - dos pestañas editando lo mismo;
  - reenvío del formulario;
  - botón Atrás y recarga en mitad del checkout;
  - webhook de pago repetido o fuera de orden;
  - pago tardío tras la cancelación.
- **Sesión:**
  - expira a mitad del flujo;
  - cambio de rol;
  - usuario sin permisos que entra por URL directa y por API;
  - carrito de invitado → login → fusión del carrito.
- **Datos límite:** cantidad 0, negativa o enorme; precios con decimales; textos con tildes, emojis e inyección (`<script>`, `' or 1=1`); campos vacíos; SKU inexistente; productos sin precio, sin imagen o despublicados en el carrito.
- **Consistencia entre módulos:** lo que ve el cliente en `/cuenta` = lo que ve el personal en el admin = los reportes y el dashboard = la auditoría. Las notificaciones se disparan una sola vez.
- **Tiempo:** fechas y horas en hora de Lima en todos lados, pedidos que cruzan la medianoche y expiraciones.

### Registro
- Cada hallazgo lleva:
  - pasos exactos para reproducirlo;
  - resultado esperado vs. obtenido;
  - severidad P0–P3;
  - evidencia (captura, log o consulta);
  - archivo:línea.
- Los P0/P1 se corrigen y se **re-prueban con la misma secuencia**.
- Tabla final:
  - escenario × criterio × resultado;
  - defectos encontrados, corregidos y pendientes.

## Verificación
- Sin commit.
- `tsc`, lint (0/0), `test-all` y `build`.
- Reporta:
  - tabla de escenarios;
  - métricas;
  - violaciones de axe;
  - pendientes;
  - archivos cambiados.
