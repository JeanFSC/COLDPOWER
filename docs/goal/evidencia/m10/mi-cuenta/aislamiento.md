# Aislamiento por cliente — M10-05

## Método

Se ejecutó el servidor local en `localhost:3006` con el bypass de desarrollo permitido solo para ese host, alternando dos usuarios cliente:

- Cliente A: `user_3HsX8RHS2xwA0sPrSpXAe5SdDOO` — 3 pedidos, 2 cotizaciones, 3 pagos.
- Cliente B: `user_3InfeDELRB58kid0v4gzhQf5ZPP` — sin actividad asociada.

No se usó Neon ni `.env.local`. El fixture `[DEV] M10-05 account ownership` solo enlazó de forma idempotente el cliente local previamente huérfano a A, con guard de producción y host.

## Evidencia UI

- A renderizó el hub con pedidos/cotizaciones/pagos reales y las capturas `hub-datos-*`, `pedidos-*`, `cotizaciones-*` y `pagos-*`.
- B renderizó `Tu cuenta está lista` y el estado vacío sin mostrar actividad de A: [hub-vacio-1920](hub-vacio-1920.png), [hub-vacio-390](hub-vacio-390.png).

## Evidencia API

Con el bypass de B, las tres rutas devolvieron HTTP 200 con `totalItems=0`:

```text
/api/cuenta/pedidos       {"items":[],"totalItems":0,"totalPages":1}
/api/cuenta/cotizaciones  {"items":[],"totalItems":0,"totalPages":1}
/api/cuenta/pagos         {"items":[],"totalItems":0,"totalPages":1}
```

Con el bypass de A, las mismas rutas devolvieron respectivamente `totalItems=3`, `2` y `3`.

La autorización se valida en servidor: pedidos y pagos filtran por `orders.userId = userId OR customers.userId = userId`; cotizaciones filtran por propiedad directa o por `customer_quote_links → customers.userId`. No se acepta `customerId` desde el cliente para decidir propiedad.
