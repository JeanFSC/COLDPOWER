# Auditoría visual interactiva — 2026-08-15

## Alcance

- Portada pública en escritorio y móvil.
- Encuadre del asset editorial del hero.
- CTA `Explorar catálogo`.
- Catálogo público en móvil.
- Panel móvil de filtros.
- Pantallas reales de Clerk en inicio de sesión y registro, en escritorio y móvil.

## Hallazgo corregido

El asset editorial del hero tenía espacio vacío a la izquierda y, con el encuadre inicial, el protagonismo del producto quedaba recortado o desplazado hacia el borde derecho. Se ajustó el encuadre responsive para que el bloque de escritorio conserve la composición completa y el móvil mantenga una imagen contenida sin overflow horizontal.

## Evidencia aceptada

- `09-home-desktop-capture-safe.png`: composición completa visible en viewport de escritorio compatible con la captura.
- `10-home-mobile.png`: portada móvil sin overflow horizontal y con jerarquía de título, búsqueda, CTAs y producto.
- `11-catalog-mobile.png`: navegación real desde `Explorar catálogo` y estado vacío recuperable.
- `12-catalog-mobile-filter.png`: apertura real del panel de filtros con controles y acción `Aplicar filtros`.
- `21-sign-in-social-bottom.png`: Clerk integrado dentro de la card visual de inicio de sesión, con el proveedor social debajo de la acción principal, sin segunda card ni desborde.
- `16-sign-up.png`: registro real renderizado con Clerk y copy ColdPower.
- `19-sign-in-mobile-top.png`: inicio de sesión móvil sin overflow horizontal.
- `17-sign-up-mobile.png`: registro móvil sin overflow horizontal.

## Nota sobre el capturador

El layout se probó también con viewport CSS de 1440 px, pero el capturador del navegador exporta una imagen de 988 px de ancho y recorta la parte derecha de esa evidencia. Por eso `09-home-desktop-capture-safe.png` usa un viewport de 1024 px para que la composición se vea completa en el archivo capturado.

## Límite de la auditoría

No fue posible inspeccionar visualmente las pantallas protegidas del panel admin en esta sesión porque el navegador integrado no tenía la sesión autenticada y el conector de Chrome no estuvo disponible. La verificación admin queda sustentada por los contratos, pruebas y build ejecutados previamente; no se presenta como una inspección visual autenticada.
