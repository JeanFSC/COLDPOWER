# Checklist de Producción ColdPower

## Datos reales obligatorios antes de producción

Bloqueante. Mientras sigan en placeholder, mantener `NEXT_PUBLIC_ALLOW_PLACEHOLDER_COMPANY_DATA=false`
para que el build de producción falle de forma controlada (ver `src/lib/env.ts`).

- WhatsApp real.
- Correo comercial real.
- Teléfono real.
- RUC real.
- Dirección/sede real.
- Redes sociales reales o no mostrarlas (dejar vacías).
- Dominio real.
- Políticas legales reales.
- Libro de reclamaciones validado.

## Marca y contenido

- Validar tono comercial.
- Reemplazar textos placeholder.
- Confirmar fotografías o assets finales.

## Legal

- Confirmar RUC.
- Confirmar dirección fiscal/comercial.
- Implementar libro de reclamaciones legal real.
- Agregar políticas de privacidad y términos si aplica.

## SEO

- Validar title y description por página.
- Revisar Open Graph.
- Revisar robots y sitemap.
- Configurar dominio definitivo.

## Performance

- Revisar peso de imágenes.
- Medir Core Web Vitals.
- Evitar scripts de terceros innecesarios.

## Seguridad

- Revisar headers.
- Mantener variables sensibles fuera del cliente.
- Revisar rate limit de API.
- Agregar protección anti-spam real si aumenta el tráfico.

## Analytics

- Definir herramienta de medición.
- Configurar eventos de cotización.
- Medir clics de WhatsApp.

## Operación comercial

- Definir responsables de atención.
- Establecer SLA de respuesta.
- Documentar flujo de seguimiento.

## Catálogo

- Validar productos reales.
- Validar stock.
- Validar precios.
- Validar compatibilidad por producto.

## Cotizaciones

- Persistir solicitudes.
- Enviar notificaciones internas.
- Conectar CRM si se aprueba.
- Definir estados de seguimiento.

## Despliegue

- Configurar dominio.
- Configurar variables de entorno.
- Ejecutar `pnpm lint`.
- Ejecutar `pnpm build`.
- Probar rutas principales.

## Backups/futuro CMS

- Definir fuente de verdad del catálogo.
- Definir estrategia de backups.
- Evaluar CMS o panel admin en fase posterior.
