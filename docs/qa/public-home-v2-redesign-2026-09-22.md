# Home público V2 — QA visual y funcional

- Fecha: 2026-09-22.
- Checkout verificado: `C:\Users\jean_\Desktop\COLDPOWER`.
- Rama observada: `codex/goal-impecable`, `HEAD 3ed9851`.
- Referencia: `C:\Users\jean_\.codex\attachments\5fcd37c9-7265-4731-8f2f-1665e1ab89f3\image-1.png` y `pasted-text-1.txt` del mismo adjunto.
- Preview autenticado: `https://dev.coldpower.pe/`.
- Assets integrados: `public/images/home-v2-hero-hvac.png` y `public/images/home-v2-brand-trust.png`.

## Estado funcional y de datos

La página consume el catálogo publicado desde PostgreSQL. En la sesión de QA se observaron 1 categoría, 4 referencias y 3 marcas; la interfaz conserva ese estado real sin inventar categorías, stock, compatibilidad, precios ni tabs comerciales.

Se preservaron las acciones existentes: búsqueda técnica, ficha de producto, comparador, carrito persistente, lista de cotización, contacto, cotización, cuenta y navegación por categorías/marcas. Los bloques CMS no desplazan el hero: los bloques editoriales se renderizan únicamente en el slot explícito `after_categories`.

## Evidencia visual en navegador

- Desktop: Chrome con sesión autenticada, preview público, pantalla de 1920 × 1080 y zoom 100%. Se revisaron barra de preview, barras comerciales, header, búsqueda, navegación, hero HVAC, CTAs, asesoría y comienzo de categorías.
- Estados inferiores: se revisaron referencias reales, guía de compra, asistencia, FAQ y footer. La asistencia se mostró como estado blanco de contacto y el FAQ mostró las cuatro preguntas nuevas.
- FAQ: al abrir `¿Cómo encuentro una referencia?`, el botón cambió su estado y apareció la respuesta asociada; las filas siguientes se desplazaron sin romper la grilla.
- Búsqueda: el botón del header llevó a `/buscar?q=p` y mostró la vista de resultados con tarjetas del catálogo.
- Responsive: se capturó la Home en una ventana de 390 × 844 px. El header cambió a acciones compactas, la búsqueda ocupó el ancho disponible, el hero refluye en varias líneas y no se observó desbordamiento horizontal. Chrome fue restaurado a maximizado al terminar.
- Consola: no apareció overlay de error en la pestaña activa de ColdPower. El snapshot global también detectó dos pestañas antiguas `localhost` con `chrome-error://chromewebdata/`; se consideran ruido de otras pestañas y no un error de la Home pública.

## Verificación automatizada

- `corepack pnpm exec tsc --noEmit`: PASS.
- `corepack pnpm build`: PASS con Next.js 16.2.9.
- `corepack pnpm lint`: PASS, 0 errores y 20 warnings de código no relacionado con Home V2.
- `corepack pnpm exec tsx --test scripts/catalog-view-model.test.ts scripts/compatibility-safety.test.ts scripts/category-aliases.test.ts`: PASS, 4/4.
- `corepack pnpm test:inventory`: 19/20. El único fallo requiere el archivo externo ausente `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`.

## Resultado

Home V2 queda validada visual y funcionalmente en desktop y 390 px, con datos reales, acciones preservadas y estados honestos. No se detectó un defecto P0/P1/P2 en los estados inspeccionados. La prueba de inventario queda condicionada únicamente por el workbook externo no disponible.

Resultado: `passed` con la limitación externa documentada.
