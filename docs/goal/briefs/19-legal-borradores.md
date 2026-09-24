# Brief 19 — Páginas legales en borrador (Codex)

Lee `AGENTS.md`. Base de datos local. Nunca Neon.

ColdPower vende repuestos de refrigeración, HVAC y línea blanca en Perú: tienda online con cotización, compra, pago (hoy simulado), despacho (Recojo / Delivery Lima / Provincia) y cuentas de cliente.

## Tareas
1. Redacta **borradores** en español, adaptados al negocio real (revisa las rutas y los flujos del proyecto para no prometer lo que el sistema no hace):
   - `docs/legal/terminos-y-condiciones.md`: compra, cotización, precios "bajo cotización", disponibilidad, despacho, pagos, cuentas, limitación de responsabilidad, Libro de Reclamaciones.
   - `docs/legal/politica-de-privacidad.md`: Ley N.° 29733 y su reglamento. Datos que realmente se recogen (revisa los formularios y el esquema: cuenta, cotizaciones, contacto, newsletter, adjuntos), finalidades, derechos ARCO, encargados (Clerk, Neon, pasarela), conservación y contacto.
   - `docs/legal/cambios-y-devoluciones.md`: repuestos eléctricos y electrónicos, garantía, plazos y condiciones (marca como `[DEFINIR]` los datos que Jean debe completar).
   - Datos de la empresa: RUC, razón social y dirección van como `[DEFINIR]`. **No inventes.**
2. Páginas `/terminos`, `/privacidad` y `/cambios-y-devoluciones` que renderizan esos borradores con el diseño público actual.
   - Protegidas por un flag en la configuración de la empresa (`legalPagesPublished`, **por defecto false**).
   - Con el flag en false, las rutas devuelven 404 y el footer no muestra los enlaces.
   - Con el flag en true, aparecen los enlaces "Términos y condiciones | Política de privacidad" en el footer, como en la referencia del home.
   - Encabezado visible: "Documento en revisión legal" mientras el texto contenga `[DEFINIR]`.
3. Un control en `/admin/configuracion` para activar el flag (solo SUPERADMIN, con auditoría).

## Verificación
- Sin commit.
- `tsc`, lint (0/0) y contratos.
- Capturas de las 3 páginas con el flag activado (en local) en `docs/goal/evidencia/19/`.
- Tras la prueba, deja el flag desactivado.
- Reporta.
