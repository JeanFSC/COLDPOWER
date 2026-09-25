# M10-03 — Tienda: ficha de producto, copy y pulido (Codex)

Protocolo: `docs/goal/ORQUESTACION.md`. Meta: `docs/goal/META-10.md` (§4b Tienda).

**El home es espejo** de la referencia de Jean (`docs/goal/designs/home-espejo/`): **no lo toques**. Estilo de la tienda: se conserva (naranja o café como CTA de marca). Solo se corrige lo listado.

## Entorno
- `corepack pnpm exec dotenv -e .env.localdb -- next dev --port 3003 --webpack`; cliente sin sesión en `http://localhost:3003`.
- Para `/cuenta`, usa bypass con un usuario cliente si hace falta (`CP_DEV_AUTH_ALLOWED_HOSTS=localhost:3003`).
- **Prohibido:** `.env.local`, `proxy.ts`, Neon y commit. El puerto 3005 es de Claude.

## 1. Ficha de producto (`/producto/[slug]`)
- **Quitar del lado cliente** el chip "Estado fuente: …" (`src/components/product/TechnicalIdentity.tsx:28`). Es metadata interna de importación: queda solo en el admin.
- **"Bajo consulta":** una sola vez, como estado comercial claro con su explicación ("Precio y disponibilidad se confirman al cotizar"). Hoy aparece en el chip y otra vez en la grilla.
- **Descripción:** si no hay `editorialDescription`, **no** inventes una frase de relleno ("Referencia de catálogo de la familia…"). Muestra los datos técnicos y una línea útil real ("Repuesto para {aplicación}. Verifica el código {modelo} antes de comprar."), solo con campos existentes. **Nunca** inventes compatibilidad.
- **CTA sobre el pliegue a 1920×1080:** la caja de transacción (precio o "Bajo consulta", cantidad, **Agregar al carrito / Cotizar** y **WhatsApp** si hay número) debe verse en el primer viewport, en la columna derecha, arriba de las especificaciones. Las especificaciones pasan debajo o a la pestaña.
- **Unidad de medida:** mapea los códigos SUNAT o crudos a texto humano ("UNIDAD (BIENES)" → "Unidad"; "NIU" → "Unidad"; etc.) con un diccionario central.
- **Mobile:** mantén el CTA fijo inferior. Verifica que no tape contenido ni el badge de Next en dev.

## 2. Copy en español (tildes y signos)
- Revisa **todas** las cadenas visibles de la tienda y la cuenta.
- Empieza por `/cotizacion`: "COTIZACIÓN", "Solicita una cotización", "validará", "¿Qué repuesto necesitas?", "Nombre o razón social", "Teléfono", "8 dígitos", "Llamada telefónica", "No encontré mi producto", "refrigeración", "descripción".
- Método: `rg -n "cotizacion|telefono|razon|digitos|Que |encontre|refrigeracion|descripcion|validara|informacion|electronico" src --glob "*.tsx"` y corrige solo los textos visibles; **no** cambies identificadores, rutas ni claves.
- Agrega la prueba `scripts/storefront-copy.test.mjs`, que falle si reaparecen esas formas sin tilde en los componentes de la tienda.

## 3. Detalles
- **404:** quitar el chip "Imagen referencial" de la ilustración (solo aplica a fotos de producto).
- **Carrito, catálogo, categoría, contacto, FAQ, nosotros y reclamaciones:** revisa a 1920 y 390 ortografía, textos cortados y botones que se parten en 2 líneas, y corrige.

## Verificación
- Capturas antes y después a 1920×1080 y 390×844 de cada página tocada, en `docs/goal/evidencia/m10/tienda-pulido/`.
- Consola limpia. axe sin violaciones.
- Recorrido por UI: buscar "capacitor" → ficha → cotizar → enviar cotización mínima (nombre + teléfono) → confirmación.
- `tsc`, lint 0/0, `test-all` (solo el Excel externo) y build.
- Informe por punto. Sin commit.
- **Imágenes referenciales por familia:** "CARBON AMOLADORA BOSCH" (CP-AMO-CAR-1027) muestra la imagen de conexiones de cobre y tornillos (otra familia). Revisar el mapeo del placeholder por familia (carbones y escobillas).
