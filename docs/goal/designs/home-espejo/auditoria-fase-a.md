# Auditoría Fase A — Home espejo (Claude, 2026-09-24)

Comparé lado a lado `referencia.png` y `mock-1920.png` escalado a 984 de ancho, y revisé `mock-390.png`.

## Veredicto
- **Aprobado:**
  - los 19 activos de `public/images/home-espejo/`: calidad y composición fieles a la referencia;
  - `spec.md`: medidas, tipografía y color;
  - la estructura: orden de secciones, 8 categorías, 6 + 6 productos, rail doble y footer de 5 áreas.
- **Rechazados los mocks:** la ejecución no se ve igual a la referencia.

Los defectos de abajo se corrigen **directamente en la implementación (Fase B)**. La aprobación final se hace con la captura real a 1920, puesta lado a lado con la referencia.

## Defectos a corregir (todos obligatorios)

### Iconos y escala del texto
1. **Iconos rotos en toda la página:** salen cuadros "▯" en utility bar, header, "Todas las categorías", beneficios del hero, accesos "Avanza…", chevrons del FAQ, pasos de asesoría, flechas de CTA y redes.
   - Usa SVG inline (`lucide-react` si ya está en el proyecto, o SVG propios), nunca glifos de fuente.
   - Redes del footer: iconos de marca a color (FB azul, IG degradado, LinkedIn azul, YouTube rojo), como en la referencia.
2. **Escala tipográfica demasiado pequeña.** El mock deja casi todo el texto al ~60–70% de la referencia. Aplica la tabla §4 del `spec.md` (valores a 1920):
   - nombre de producto 16–18 px / 650–700;
   - precio 20–22 px / 800;
   - CTA 16 px;
   - títulos de sección ~30 px;
   - subtítulos 15–16 px;
   - utility bar 14 px;
   - nav 15–16 px;
   - footer 15–16 px.
3. **Choques de texto:** los subtítulos de sección se montan sobre los grids (Avanza, Busca por el trabajo, Nuevos ingresos). Cada encabezado ocupa su alto y deja el gap de la referencia antes del grid.

### Header y hero
4. **Header:**
   - logo al tamaño de la referencia (≈ 14–16% del ancho útil);
   - buscador alto (≈ 56 px a 1920) con botón azul cuadrado;
   - "Cotización (0)" naranja con icono;
   - "Mi cuenta / Ingresar" en dos líneas;
   - "Carrito (0) ▾";
   - todo alineado en el mismo eje vertical.
   - Utility bar: iconos + separadores "|", y el segmento derecho de WhatsApp en naranja más oscuro con corte diagonal, como en la referencia.
5. **Hero:**
   - la 3.ª línea del H1 ("en un solo lugar") **no puede montarse** sobre la fila de beneficios;
   - beneficios con line icons blancos (camión/caja, engranaje, escudo), no círculos azules;
   - el manuscrito "Tu proyecto, nuestro respaldo" va arriba a la derecha sobre fondo despejado, **legible**, en azul oscuro y con trazo naranja bajo "respaldo". Que no pise el ventilador: ajusta el encuadre de la imagen (`object-position`) o reposiciona;
   - card de aplicaciones con line icons azules en cuadro, no puntos.

### Productos, accesos y banners
6. **Product cards (ambos grids):**
   - la imagen ocupa ≈ 45–50% del alto de la card, centrada, grande;
   - el precio **no puede quedar cortado** ni tapado por el botón. El orden es nombre (2 líneas) → Cód. → marca → precio → botón, con los mismos espacios de la referencia;
   - la imagen de cada producto sale de `resolveProductImage` con su familia real: controlador → termostatos-controles, refrigerante → refrigerantes, hélice → motores-ventiladores… **En el mock salían compresores en productos que no lo son.**
7. **"Avanza con el dato…":** icono blanco dentro de un cuadrado azul redondeado, título en negrita, microejemplo ("Ej: R404A, 12000 BTU") y chevron ">" a la derecha.
8. **Banner navy:** el panel de beneficios es una **columna clara de alto completo** pegada al borde derecho del banner (fondo gris muy claro, 4 filas con iconos azules/verde WhatsApp), no una card flotante pequeña.

### Marcas, rail y ayuda
9. **Marcas:** tiles contiguos con separadores finos y logos a color al tamaño de la referencia.
   - Solo marcas que existen en la base de datos, en el orden de la referencia cuando existan.
   - Logos: puedes usar el **SVG oficial** de cada marca desde Wikimedia Commons o el press kit oficial (uso nominativo de un distribuidor). Registra la fuente y la licencia de cada archivo en `public/brands/SOURCES.md` y guárdalos en `public/brands/<slug>.svg`.
   - **Nunca generes logos con IA.** Si no hay SVG oficial, usa el wordmark tipográfico al mismo tamaño.
10. **Rail derecho de "Nuevos ingresos":** la columna derecha (≈ 25%) abarca **toda la altura de Nuevos ingresos + el bloque de ayuda**.
    - Banner "OFERTAS del MES" (alto ≈ 343 px a 1920): alineado arriba con el título de Nuevos ingresos.
    - Banner "Herramientas y equipos de instalación" (≈ 211 px): alineado con el bloque FAQ/asesoría.
    - Textos completos: "OFERTAS" / "del MES" grande, subcopy "Equipos, repuestos y herramientas", botón blanco. En el mock se cortaba a "OFERTAS" y se perdía la subcopy.
11. **Bloque de ayuda:**
    - pasos de asesoría como 4 mini-cards con borde, icono de línea azul y texto de 2 líneas;
    - botón "Solicitar ayuda por WhatsApp" naranja con icono de WhatsApp;
    - acordeones con chevron.

### Footer y móvil
12. **Footer:**
    - logo grande;
    - columna Contáctanos con iconos (teléfono, correo, ubicación) y **botón verde "Escríbenos por WhatsApp"**;
    - newsletter a la derecha con separador vertical;
    - redes a color bajo el texto de marca;
    - texto al tamaño de la referencia.
13. **Móvil 390:** mantener la estructura propuesta (2 columnas), sin solapes:
    - etiquetas de categoría debajo de su imagen;
    - precios y botones sin cortar;
    - rail apilado con el texto completo;
    - header con iconos visibles;
    - tabs en scroll horizontal;
    - footer apilado con todos los grupos.

## Criterio de aprobación (lo verifica Claude)
- Captura real full-page a 1920×1080 (zoom 100%) escalada a 984 de ancho junto a la referencia (`comparacion.png`).
- Cada sección coincide en posición, alto, columnas, cantidad, escala tipográfica, iconos y color dentro de ±5%.
- Sin cuadros "▯".
- Sin textos cortados ni solapados, también a 390.
- Consola sin errores.
