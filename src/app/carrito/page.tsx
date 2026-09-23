import type { Metadata } from "next";
import { CartPageView } from "@/components/shopping-cart/CartPageView";

export const metadata: Metadata = { title: "Carrito de compra", description: "Revisa los productos que vas a comprar en ColdPower." };

export default function CartPage() {
  return (
    <section className="bg-background py-10 sm:py-14">
      <div className="cp-container">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Compra online</p>
        <h1 className="mt-3 font-display text-4xl font-black text-dark">Carrito de compra</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-text">Precios publicados, verificados otra vez al pagar. ¿Necesitas precio especial o un producto sin precio? Usa la <a href="/cotizacion" className="font-extrabold text-primary hover:underline">cotización</a>.</p>
        <div className="mt-8"><CartPageView /></div>
      </div>
    </section>
  );
}
