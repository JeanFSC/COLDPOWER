# CP-029 — Plan de ejecución backend / BD / Auth / RBAC

> Ejecutar únicamente en `fix/cp029-be-blockers`, creada desde `bf57206`. La rama `release/coldpower-v1.0-rc1` permanece congelada.

## Objetivo

Cerrar la auditoría P0 de preproducción sin tocar frontend, datos de negocio ni infraestructura externa. La base de verdad será PostgreSQL y cada conclusión se respaldará con SQL, servicio, respuesta HTTP, prueba o runtime observable.

## Fases

### 1. Línea base y trazabilidad

- Confirmar SHA base, rama y árbol limpio.
- Ejecutar SQL de conciliación de productos, SKU, estados editoriales, revisión, duplicados exactos y duplicados editoriales.
- Identificar el flujo real de `/admin/catalogo`: server page, servicio, filtros, paginación y API administrativa separada.
- Confirmar variables presentes sin imprimir valores y que localhost/dev apuntan lógicamente al mismo entorno.
- Guardar solo evidencia no sensible.

### 2. Autenticación y RBAC

- Con la sesión real de `xslync@gmail.com`, validar dashboard y rutas administrativas permitidas.
- Comprobar que la resolución de acceso usa el registro interno por Clerk user ID, `SUPERADMIN` y `ACTIVE`.
- Ejecutar pruebas negativas de roles y permisos existentes; verificar que cuenta sin sesión usa 401 y APIs admin denegadas usan 403 según contratos CP-030/CP-050.
- Probar logout y login real. Si Clerk solicita OTP/MFA, detener ese paso y solicitarlo sin evadir seguridad.

### 3. Clerk webhook

- Mantener `POST /api/webhooks/clerk` como ruta canónica.
- Verificar lectura exclusiva de `CLERK_WEBHOOK_SECRET`, firma inválida, payload inválido, idempotencia y eventos fuera de orden.
- Confirmar sincronización Clerk ↔ `users`, tombstone, no duplicados y protección del último SUPERADMIN.

### 4. Corrección mínima guiada por pruebas

- Si SQL y API coinciden, no modificar servicio ni inventar una métrica para compensar la UI; documentar el handoff a Codex1.
- Si aparece un bug backend verificable, escribir primero una regresión fallida, aplicar el cambio mínimo en backend y repetir la prueba.
- No modificar `src/components`, páginas visuales ni estilos.

### 5. Verificación final

- Ejecutar tests CP-029 relevantes, `test:all`, TypeScript, lint y build de producción con `corepack pnpm`.
- Verificar runtime local y `https://dev.coldpower.pe` para raíz, health, sign-in, dashboard/catalog API y guards.
- Crear `docs/qa/cp029-be-blockers-2026-08-15.md` con SQL, before/after, causa raíz, auth, RBAC, Clerk, comandos y resultados.
- Commit descriptivo, push de la rama fix sin mergear RC1, `git status` limpio y SHA final registrado.

## Guardas de seguridad

- No mostrar valores de secretos ni cookies.
- No crear productos, stock, precios, ventas, clientes, órdenes, cotizaciones, pagos, proveedores o métricas para satisfacer pruebas.
- No regenerar secretos ni tocar Cloudflare/DNS.
- No ejecutar operaciones irreversibles sobre datos productivos.
