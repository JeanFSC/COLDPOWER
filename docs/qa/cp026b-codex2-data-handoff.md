# Handoff CP-026B → Codex2

## Objetivo

Habilitar una muestra mínima de catálogo real para cerrar el QA visual del frontend sin modificar componentes UI ni inventar datos.

## Solicitud

Publicar mediante el flujo editorial existente entre 3 y 5 productos reales provenientes de la fuente importada, cubriendo cuando sea posible:

- un repuesto de refrigeración;
- un motor o ventilador;
- un componente eléctrico como capacitor o tarjeta;
- una categoría/familia con jerarquía válida;
- al menos un registro con media activa real o fallback editorial permitido.

No crear nombres, SKU, marcas, stock, precio ni fotografías ficticias. Si un registro no cumple la compuerta editorial, conservarlo en revisión y devolver el motivo.

## Evidencia requerida

Entregar al frontend:

1. SKU y slug de cada producto publicado.
2. Categoría, familia y marca persistidas.
3. Estado de publicación y disponibilidad real.
4. Identificador de media activa, si existe.
5. Respuesta no vacía de la consulta pública de catálogo.
6. URL de una categoría con referencias publicadas.
7. URL de una ficha de producto que responda como PDP, no 404.

## Criterios de no regresión

- No cambiar contratos de `/api/catalog/products`, `/api/catalog/search` ni cotización.
- No alterar permisos, RBAC, inventario ni historial de importación.
- Mantener los registros no publicables fuera del catálogo público.
- No forzar publicación masiva de los 1,348 registros.

## Verificación frontend posterior

Con los SKU/slugs entregados se repetirá:

- home con productos y categorías visibles;
- catálogo con grid real y conteo;
- categoría con filtros y cards;
- PDP con galería, identidad, disponibilidad y CTA;
- agregar/quitar/modificar línea de cotización;
- capturas desktop, tablet y mobile del ticket CP-026B.

## Pendiente separado

Definir y persistir textos/enlaces legales aprobados para términos, privacidad y libro de reclamaciones. No deben resolverse con contenido inventado desde frontend.
