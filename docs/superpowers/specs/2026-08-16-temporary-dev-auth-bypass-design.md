# Bypass temporal de autenticación para desarrollo local

Fecha: 2026-08-16  
Alcance: solo desarrollo local de ColdPower

## Objetivo

Permitir que el equipo entre temporalmente al dashboard local para QA sin completar Clerk en cada sesión, manteniendo PostgreSQL y RBAC como autoridad. Este mecanismo no debe funcionar en producción ni habilitar el dashboard público por el túnel `dev.coldpower.pe`.

## Diseño aprobado

El bypass será server-side y tendrá tres condiciones simultáneas:

1. `CP_DEV_AUTH_BYPASS=true` en `.env.local`.
2. `NODE_ENV` y `VERCEL_ENV` no pueden ser `production`.
3. El host solicitado debe estar en `CP_DEV_AUTH_ALLOWED_HOSTS`; por defecto se usará `localhost:3000`.

El actor temporal se toma de `CP_DEV_AUTH_USER_ID`, que debe ser el ID de Clerk del registro interno existente. El sistema consultará ese ID en PostgreSQL y aplicará `ACTIVE`, `roleCode` y `can(permission)` igual que con una sesión Clerk normal. No se usará un correo, un rol hardcodeado ni un flag del frontend.

El resolver se compartirá entre `src/proxy.ts` y `src/lib/auth.ts`: el middleware permitirá continuar únicamente cuando el usuario temporal tenga acceso staff persistido; los guards de páginas y APIs volverán a consultar el registro y permisos. Si el flag está activo en producción, el resolver falla cerrado al procesar una petición protegida. El build puede compilar sin el bypass porque `next build` usa `NODE_ENV=production` incluso cuando se ejecuta localmente; la protección relevante es la solicitud runtime.

## Activación y retiro

Solo `.env.local` contendrá temporalmente:

```env
CP_DEV_AUTH_BYPASS=true
CP_DEV_AUTH_USER_ID=<id de Clerk de xslync@gmail.com>
CP_DEV_AUTH_ALLOWED_HOSTS=localhost:3000
```

Antes de producción se eliminan estas tres variables de `.env.local` y de cualquier gestor de secretos. El código también rechaza el flag en producción, por lo que una configuración accidental no abre el dashboard.

## Pruebas

La regresión cubrirá: bypass válido en localhost, host no permitido, usuario ausente, bypass apagado, `NODE_ENV=production`, `VERCEL_ENV=production` y preservación del chequeo RBAC mediante el registro persistido. La verificación runtime abrirá `/admin/dashboard` y las APIs administrativas en localhost; `dev.coldpower.pe` seguirá protegido por Clerk.
