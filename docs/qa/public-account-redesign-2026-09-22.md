# QA — Rediseño público de `/cuenta` (CP-061)

Fecha: 2026-09-22  
Repositorio: `C:\Users\jean_\Desktop\COLDPOWER`  
Branch: `codex/rama`  
HEAD inicial y final observado: `22ab2b367de9284b93f0b86388fb04f2564533b0`  
Estado: cambios locales sin commit; el checkout contiene además cambios concurrentes fuera del alcance CP-061.

## Alcance y decisión de diseño

Se rediseñó la página autenticada `/cuenta` tomando la imagen adjunta como referencia de composición: banner privado, shell público ColdPower, breadcrumb, hero con unidad condensadora/caja ColdPower/geometría de hielo, tarjeta de perfil, cuatro accesos operativos, actividad reciente, ayuda, CTA de cotización y footer.

La imagen de hero se generó a partir de la referencia mediante la herramienta de generación visual y se aplicó como asset real del producto:

- `public/images/account-hero-coldpower.webp` — 1600×850, SHA-256 `D945CFD5A8A235A688CC4EE27769A418771BAFA084F7E446171877246F4DE899`.
- No se usaron placeholders ni ilustraciones CSS para sustituir la imagen principal.

La pantalla no agrega KPIs ejecutivos ni bloques administrativos dominantes. La acción administrativa queda como enlace discreto y solo se entrega a roles staff/admin.

## Archivos del alcance

- `src/app/cuenta/page.tsx`: nueva composición server-rendered, estados honestos, rutas reales, actividad y CTA.
- `src/lib/account-overview.ts`: contrato de resumen de cuenta y consultas ownership-scoped.
- `src/app/api/cuenta/perfil/route.ts`: GET/PATCH autenticado para el perfil propio.
- `src/components/account/AccountProfileEditor.tsx`: drawer accesible de edición.
- `src/components/layout/Footer.tsx`: enlaces de cuenta, ayuda, contacto y redes configuradas; se retiró la exposición de métodos de pago enum/raw.
- `scripts/cp061-public-account.test.mjs`: contrato estático del rediseño.
- `scripts/customer-history-contract.test.mjs`: contrato de actividad pública y servicios de cuenta.
- `package.json`: script `test:cp061`.
- `docs/qa/cp061-account-1920.png`: evidencia de navegador.

## Datos, autenticación y ownership

- La página usa `requireUser()` y el `userId` autenticado; no recibe `customerId` desde URL, query, formulario ni cliente.
- `getAccountOverview(userId, role)` resuelve `users → customers` por `customers.userId = users.id`.
- Cotizaciones, historial de estados, pedidos y pagos se filtran por el usuario autenticado o por el Customer vinculado al mismo usuario. No se aceptan identificadores de otro cliente como entrada de confianza.
- El carrito mostrado es el carrito de cotización persistido (`quoteCarts`), con usuario autenticado, vigencia por `expiresAt` y conteo real de items.
- Los conteos de cotizaciones, pedidos y pagos provienen de consultas persistentes; no hay arrays hardcodeados ni fallback en memoria para el dominio comercial.
- Si no existe Customer, la pantalla muestra: “Tu cuenta está activa, pero todavía no encontramos un perfil comercial asociado”. No se inventan empresa, dirección, teléfono, cliente ni datos comerciales.
- El usuario de validación local no tenía Customer asociado; por eso la evidencia muestra el estado honesto y el CTA administrativo correspondiente al rol real de desarrollo.

## Edición de perfil

- `GET /api/cuenta/perfil` y `PATCH /api/cuenta/perfil` exigen autenticación y responden JSON en errores de autorización; no redirigen una llamada API a HTML.
- Se permiten nombre y teléfono en el perfil propio.
- Empresa, dirección y preferencia de contacto se habilitan únicamente cuando existe Customer vinculado.
- El correo se muestra como dato de identidad y no es editable por este endpoint.
- La mutación valida tipos, longitudes, preferencia de contacto y formato básico antes de persistir.
- La actualización de usuario, Customer/dirección propia y el registro de auditoría se ejecutan dentro de la misma transacción cuando corresponde.
- La auditoría registra campos modificados, sin copiar valores PII completos en metadata, y se revalida `/cuenta` después de guardar.
- El drawer usa `role="dialog"`, `aria-modal`, título asociado, foco inicial en cerrar, cierre con `Escape`, cierre explícito, foco visible, navegación por teclado y estados inline de error/éxito. No usa `alert`, `prompt` ni reload.
- En el estado sin Customer se muestra “Agregar” únicamente para teléfono, que sí está soportado; empresa y dirección permanecen honestamente limitadas.

## Rutas e integraciones

Los cuatro accesos de la referencia se conectan a rutas existentes y reales:

- `/cuenta/cotizaciones`
- `/cuenta/pedidos`
- `/cuenta/carrito` — carrito de cotización persistente ya existente; no se creó un segundo carrito paralelo.
- `/cuenta/pagos`

También se mantienen rutas reales para `/contacto`, `/faq` y `/cotizacion`. La configuración de cuenta lleva al editor del perfil. No se añadió “Mis listas” ni acciones sin backend.

La actividad reciente muestra como máximo cinco eventos públicos de cotizaciones, pedidos y pagos, ordenados por fecha en zona horaria `America/Lima`. Se excluyen auditoría cruda, notas internas, márgenes, costos, permisos y metadata interna.

## RBAC y seguridad de presentación

- El CTA “Ir al panel administrativo” solo aparece para roles staff/admin según el rol resuelto por servidor.
- El usuario no staff no recibe el enlace administrativo ni un bloque de administración.
- Las tarjetas de cuenta no revelan entidades de otros clientes por identificador manipulable.
- Los estados comerciales se convierten a etiquetas customer-facing; no se expone el enum interno sin traducción.
- El footer conserva contacto/WhatsApp/redes solo si están configurados. No muestra `CREDIT_CARD`, `YAPE`, `PLIN`, `CASH` ni el bloque raw “Medios de pago”.

## Validación visual y browser QA

Se usó el navegador persistente autenticado disponible para ColdPower en `http://localhost:3002/cuenta`, con el bypass de desarrollo ya activo en ese runtime y el usuario real de desarrollo. No se modificó `.env.local`, no se sembró otro usuario y no se probó como sesión autenticada la URL pública.

Evidencia principal:

- [Captura final `/cuenta` — 1920×1080](cp061-account-1920.png)
- La captura fue tomada desde el navegador, a viewport `1920×1080`, zoom 100%, después de recargar el footer corregido.
- Se verificó visualmente hero, shell, perfil, estado sin Customer, cuatro tarjetas, actividad, ayuda, CTA y footer.
- Se abrió el drawer de “Editar información”, se confirmó el diálogo y se cerró con `Escape`; no hubo reload ni alert.
- Tras recargar, “Medios de pago” no apareció en el DOM renderizado.

Barrido responsive en el mismo navegador:

| Viewport | Resultado | Evidencia |
|---|---|---|
| 1440×900 | Sin overflow horizontal; main y accesos presentes | `scrollWidth=1425`, `clientWidth=1425` |
| 1024×900 | Sin overflow horizontal; footer presente | `scrollWidth=1009`, `clientWidth=1009` |
| 768×900 | Sin overflow horizontal; `MI CUENTA` presente | `scrollWidth=753`, `clientWidth=753` |
| 390×844 | Sin overflow horizontal; CTA visible | `scrollWidth=375`, `clientWidth=375` |

La sesión permaneció en `/cuenta` y se restauró a `1920×1080` al finalizar.

### Limitación del runtime

La URL pública `https://dev.coldpower.pe/cuenta` respondió `307` hacia inicio de sesión en este contexto, por lo que no se afirmó una QA autenticada pública inexistente. El runtime local sí permitió validar la pantalla con sesión de desarrollo.

Durante la sesión dev se observaron errores HMR intermitentes y externos al alcance CP-061 en `src/app/page.tsx`/chunks de `app/layout` (`AssistanceSection`, `ApplicationSolutions` y otros módulos home que estaban siendo modificados concurrentemente), además de warnings de preload de desarrollo. La página `/cuenta` cargó y la captura final no mostró overlay de build; el ruido global se conserva como limitación del entorno y no se atribuye a los archivos CP-061.

## Pruebas ejecutadas

### Pasan

- `corepack pnpm test:cp061` — 5/5.
- `corepack pnpm exec tsx --test scripts/catalog-view-model.test.ts scripts/compatibility-safety.test.ts` — 3/3.
- `corepack pnpm exec tsc --noEmit` — pasa en la verificación final.
- ESLint focalizado sobre los cinco archivos CP-061 — pasa.
- `corepack pnpm build` — pasa con Next.js 16.2.9, TypeScript y generación de rutas; incluye `/cuenta` y `/api/cuenta/perfil`.

### Bloqueos o fallos fuera del alcance

- `corepack pnpm test:inventory` — 19/20; falla el caso que requiere el archivo externo ausente `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`.
- `corepack pnpm lint` global — 341 errores y 1039 warnings al recorrer `.next/dev`, `.claude/worktrees/verification-execution-rules-09b665` y cambios concurrentes fuera del alcance. El lint focalizado de CP-061 pasa.

## Criterio de cierre

El rediseño CP-061 está implementado con datos reales, ownership por servidor, mutación de perfil auditada, rutas operativas existentes, estados honestos, asset visual aplicado y evidencia de navegador/responsive. La compilación y las pruebas focalizadas pasan. El cierre de una validación global del checkout y de la URL pública autenticada queda condicionado, respectivamente, a estabilizar los cambios concurrentes del home/HMR y a disponer de una sesión autenticada válida en `dev.coldpower.pe`.
