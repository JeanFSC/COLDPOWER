# Justificaciones de ajustes de contratos

## `scripts/cp028-auth-flow-contract.test.mjs`

El contrato vuelve a leer `src/app/layout.tsx` porque `ClerkProvider` debe estar montado de forma estable desde el layout raíz. La revisión R3b rechazó `DeferredClerkProvider`: la carga diferida podía dejar rutas y componentes autenticados sin el contexto Clerk durante la navegación inicial, y el bypass de QA no sustituye una sesión Clerk real.

Se restauran en `layout.tsx` los redirects `signInFallbackRedirectUrl` y `signUpFallbackRedirectUrl` con sus props originales y se elimina el componente diferido. La prueba se ajusta para inspeccionar el punto real de integración vigente; no se modifica la regla de destino ni se debilitan guards.

## `scripts/qa/b-1-1-quote.mjs`

El SKU histórico `CP-ROT-8284` ya no pertenece al catálogo publicado local. Para no inventar datos ni editar el contrato comercial, el recorrido usa `CP-REF-MCP-0103`, que existe como producto publicado y precio persistido en PostgreSQL local. Las esperas/reintentos solo cubren la respuesta asíncrona de búsqueda y los endpoints del flujo; no cambian la lógica de negocio.
