# Tanda 2 — CP-041 a CP-050 — QA visual y funcional

## Alcance

- Rutas: `/admin/inicio`, `/admin/dashboard`, `/admin/compras`, `/admin/cms`, `/admin/reportes`, `/admin/auditoria`, `/admin/usuarios`, `/admin/configuracion`, `/admin/notificaciones` y `/admin/operaciones`.
- Referencias visuales: `C:\Users\jean_\.codex\attachments\f5d232a9-d146-4d75-b9fd-273cd95c325e\image-1.png` a `image-10.png`.
- Preview validado en Brave con sesión administrativa local y datos persistidos en PostgreSQL/Neon.

## Resultado local

- La nueva Home administrativa quedó en `/admin/inicio`; `/admin` redirige a esa ruta y `/admin/dashboard` conserva el dashboard ejecutivo independiente.
- Los diez módulos comparten shell, jerarquía, tokens visuales, métricas con `N/D` cuando la fuente no existe, tablas contenidas y estados vacíos honestos.
- Se verificó el preview local en Brave con el viewport disponible de escritorio; la matriz exacta 1440×900, 1024×768, 768×900 y 390×844 no quedó certificada porque esta sesión no permite cambiar programáticamente el viewport.
- Se verificó Ctrl/Cmd+K: la búsqueda global abre una paleta real, filtra módulos autorizados y navega a la selección.
- Se verificó la matriz efectiva de permisos por rol y el formulario empresarial con filas controladas para redes, locales y enlaces legales; no quedan editores JSON visibles.
- Se recorrieron enlaces de navegación, filtros server-side, exportaciones, detalle de usuarios, colas operativas, acciones de notificaciones y controles existentes de CMS, compras y configuración.
- Se verificaron la personalización persistida de Inicio, la programación persistida de Reportes y las acciones persistidas de toma/resolución en el Centro operativo; los workers externos o automáticos siguen señalizados como pendientes cuando no existe proveedor configurado.
- Consola local: 0 errores de aplicación; permanece únicamente el warning informativo de Clerk por claves de desarrollo.

## Datos y seguridad

- Dashboard, operaciones, compras, CMS, auditoría, usuarios, configuración y notificaciones consumen consultas/repositorios existentes; no se añadieron arrays de productos ni persistencia en memoria.
- Ventas, margen y cobros no inventan valores: muestran `N/D` cuando falta moneda, pago confirmado o costo histórico.
- La matriz de permisos se deriva de `permissionsForRole`; las acciones de dominio permanecen en sus APIs y controles existentes.

## Verificación automatizada

- `corepack pnpm exec tsc --noEmit`: PASS.
- `corepack pnpm lint`: PASS, 0 errores; los warnings restantes son no bloqueantes y se detallan en la salida de la ejecución.
- `corepack pnpm build`: PASS; rutas CP-041 a CP-050 generadas correctamente.
- `corepack pnpm exec tsx --test scripts/catalog-view-model.test.ts scripts/compatibility-safety.test.ts scripts/dashboard-contract.test.ts scripts/dashboard-definitions.test.ts`: PASS, 14/14.
- Contratos CP041–CP050: PASS.
- Runtime CP041–CP050 con `.env.local` cargado: PASS, 14/14.
- `corepack pnpm test:inventory`: BLOQUEADA por ausencia del workbook canónico requerido `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`; no se modificó ni sustituyó la fuente de catálogo.

## Bloqueo externo

`https://dev.coldpower.pe/admin/dashboard` responde con una versión anterior: no contiene el enlace Inicio y muestra el dashboard no disponible. El preview local sí refleja esta implementación, pero el despliegue remoto no fue actualizado en este ticket. Por eso la validación remota queda pendiente.

final result: verified locally; remote preview, responsive matrix and canonical inventory source pending
