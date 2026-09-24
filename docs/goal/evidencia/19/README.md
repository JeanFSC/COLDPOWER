# Evidencia — Brief 19: documentos legales

Las capturas se tomaron con el flag `legalPagesPublished=true` en la base local y se dejaron únicamente como evidencia. El estado final de la base es `false`.

| Página | Captura |
| --- | --- |
| Términos y condiciones | [terminos.png](./terminos.png) |
| Política de privacidad | [privacidad.png](./privacidad.png) |
| Cambios y devoluciones | [cambios-y-devoluciones.png](./cambios-y-devoluciones.png) |

Validación interactiva en la sesión persistente autenticada:

- Con publicación desactivada: las tres rutas mostraron el 404 público y el footer no mostró enlaces legales.
- Con publicación activada: las tres páginas mostraron el encabezado institucional, el aviso «Documento en revisión legal», sus campos `[DEFINIR]`, navegación lateral y enlaces relacionados.
- Desktop: `window.innerWidth=1920`, sin desbordamiento horizontal (`bodyWidth=documentWidth=1905` en la sesión personal).
- Responsive: viewport emulado de `390×844`, sin desbordamiento (`bodyWidth=documentWidth=390`).
- Consola: sin errores en las tres páginas; solo apareció la advertencia esperable de Clerk por claves de desarrollo.
- El cambio de publicación creó auditoría `company.legal_pages_publication_updated`; el flag final quedó apagado.
