import { redirect } from "next/navigation";

// The account cart page used to show the quote list; the purchase cart now lives at /carrito
// and the quote list at /cotizacion.
export default function CuentaCarritoPage() {
  redirect("/carrito");
}
