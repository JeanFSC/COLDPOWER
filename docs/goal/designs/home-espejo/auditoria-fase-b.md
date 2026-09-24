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
