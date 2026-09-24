# Auditoría Fase B — Home espejo, ronda 1 (Claude, 2026-09-24)

Comparé lado a lado `referencia.png` y `actual-1920.png` escalado a 984 px.

**Avance fuerte.** Estas partes ya coinciden:
- orden de secciones, contenedor y escala tipográfica;
- hero (texto, beneficios y CTA);
- productos a 6 columnas;
- accesos de "Avanza…";
- tarjetas de trabajo;
- rail doble;
- bloque de ayuda.

## Desviaciones aceptadas (honestidad de datos)
- Marcas: wordmarks de marcas reales de la base de datos.
- Precios: fixture de desarrollo.
- Contacto y redes: se ocultan si no están configurados.
- Enlaces "Términos" y "Política de privacidad": se omiten porque esas páginas no existen aún. **Se reporta como pendiente de negocio.**

## Defectos a corregir (obligatorios)
1. **Header derecho roto en desktop:**
   - aparece un recuadro gris vacío antes de "Cotización (0)";
   - falta "Mi cuenta / Ingresar";
   - al final se muestran los iconos del header móvil (lupa, usuario, documento, carrito, menú). Deben ocultarse ≥ lg.
   - El botón del buscador en la referencia es un cuadrado azul **solo con lupa**, sin la palabra "Buscar"; conserva `aria-label`.
   - Orden exacto: [Cotización (0)] [Mi cuenta / Ingresar] [Carrito (0) ▾].
2. **Manuscrito del hero:** "Tu proyecto, nuestro respaldo" no se ve; queda detrás del ventilador y solo asoma "Tu".
   - Debe verse completo y legible arriba a la derecha, como en la referencia.
   - Ajusta el `object-position`/encuadre de la foto o dale una capa propia con z-index por encima de la imagen, en azul oscuro con subrayado naranja.
3. **Card de aplicaciones del hero:** está cortada contra el borde inferior. Debe quedar completa, centrada verticalmente a la derecha y dentro del hero.
4. **Categorías — error grave.** Se tomaron 8 categorías de la base de datos por orden alfabético y se les pusieron las imágenes de la referencia en orden: "Amoladoras" con un controlador, "Arroceras" con un manifold, "Aspiradoras" con un compresor, además de contadores "0 referencias".
   - Deben ser las **8 líneas de la referencia, con su etiqueta, subtexto e imagen correspondiente**: Compresores · Refrigeración · Aire acondicionado · Motores y ventiladores · Controles · Herramientas · Repuestos · Línea blanca.
   - Cada una enlaza a un filtro o búsqueda real que devuelva resultados (familia/categoría/término).
   - Sin contadores (la referencia no los tiene). Si muestras alguno, que sea real y mayor que 0.
   - **Nunca una imagen que no corresponda a su etiqueta.**
5. **Tabs de "Referencias para empezar":** en la referencia están **a la derecha**, alineadas con el título. Sin enlace extra "Ver catálogo" en esa cabecera: no existe en la referencia.
6. **Banner navy:**
   - en la referencia es una **banda a todo el ancho**, y el panel claro de beneficios está **dentro** del banner, pegado a su borde derecho y a alto completo;
   - el botón "Solicitar cotización" es **compacto** (ancho de contenido), no una barra que atraviesa el banner.
7. **Rail derecho:** el borde superior de "OFERTAS del MES" se alinea con el **título** "Nuevos ingresos", como en la referencia; hoy está alineado con las cards.
8. **Marcas:** los tiles se reparten a todo el ancho (con 8 marcas, 8 columnas iguales).

## Estado de la base de datos
Neon está **fuera de cuota** (HTTP 402). Mientras no se restablezca:
- aplica las correcciones en el código y valida con `tsc`, lint y contratos;
- **no ejecutes scripts, servidores ni tests que consulten la base de datos**;
- deja la verificación visual final pendiente. La hará Claude cuando Neon vuelva.

---

# Ronda 2 (Claude, 2026-09-24, captura real 1920 y 390 en 3002; Neon caído, partes con datos en estado honesto)

Resueltos de la ronda 1:
- orden del header;
- banner navy a todo el ancho con panel interno y CTA compacta;
- rail alineado con el título;
- tabs y marcas (pendientes de ver con datos);
- footer.

Pendientes (obligatorios):
1. **Manuscrito del hero todavía ilegible a 1920.** "Tu proyecto, nuestro respaldo" sigue encima del ventilador azul (arriba a la derecha).
   - En la referencia el manuscrito está sobre cielo despejado, **a la izquierda del ventilador** y encima de la card de aplicaciones, con contraste pleno.
   - Mueve el encuadre de la foto (`object-position`, o desplaza la composición a la izquierda) o reubica el manuscrito para que no toque ningún equipo.
   - Criterio: el texto completo se lee a 1920 y a 1440.
2. **Logo del header demasiado pequeño.** En la referencia el lockup mide ≈ 150 px de ancho a 984 (≈ 290–300 px a 1920) e incluye la línea "SOLUCIONES EN REFRIGERACIÓN"; hoy mide ≈ 115 px a escala.
   - Usa el lockup completo al tamaño de la referencia, sin cambiar la altura del header más de ±5%.
   - Aplica el mismo criterio al logo del footer (≈ 130 px a 984).
3. **Móvil 390 — utility bar.** El texto se corta ("¿Necesitas ayuda? Escríben…"). En móvil muestra un solo mensaje que quepa completo, o hazla rotar/desplazar sin cortes.
4. **Móvil 390 — hero:**
   - el manuscrito se monta sobre el eyebrow; en móvil va en su propia línea sin solaparse (debajo de los CTA o sobre la imagen en zona libre) o se oculta;
   - el beneficio "Asesoría técnica especializada" queda sobre la foto con contraste bajo; añade un scrim/gradiente oscuro detrás del bloque de texto para contraste AA en todo el copy.
5. **Móvil 390 — rail.** "OFERTAS del MES" y "Herramientas…" no ocupan el ancho completo del contenedor (≈ 285 de 358 px). Deben ir al 100% del ancho del contenedor.

Neon sigue fuera de cuota: mismas restricciones, sin DB. Valida con tsc, lint y contratos. Claude verificará con captura real.

---

# Ronda 3 (Claude, 2026-09-24, captura real 1920 y 390)

Resueltos:
- móvil: utility bar completa, hero sin solapes y con scrim, rail al 100%;
- lockup del header ampliado.

Pendientes (obligatorios):
1. **Composición del hero (causa raíz del manuscrito).** Lo moviste, pero ahora queda sobre la condensadora y se corta ("respald…"). La causa es la foto: `hero-desktop.webp` tiene equipos hasta el borde derecho. En la referencia, a 984:
   - el grupo de equipos ocupa ≈ x 365–830 (≈ 37%–84% del ancho);
   - el ventilador azul está en ≈ 760–830 (78%–84%);
   - la franja derecha ≈ 84%–100% es fondo desenfocado claro (edificio/cielo), donde van el manuscrito (arriba) y la card de aplicaciones (abajo), sin tocar ningún equipo.
   **Regenera `hero-desktop.webp`** con esa composición exacta: equipos de 37% a 84%, franja derecha libre y la mitad izquierda con fondo de edificio azul más claro, como en la referencia. El compresor no lleva marca impresa.
   Luego el manuscrito completo "Tu proyecto, / nuestro respaldo" va en esa franja, arriba, con su trazo naranja, legible al 100% a 1920 y a 1440.
2. **H1 ≈ 11% más grande que la referencia.** "Todo para refrigeración" mide ≈ 311 px de ancho a 984 en la referencia y ≈ 345 px en la actual. Ajusta el tamaño para quedar dentro de ±5%, y conserva las tres líneas.

Mismas restricciones: sin DB, sin servidores en 3002, sin commit.
