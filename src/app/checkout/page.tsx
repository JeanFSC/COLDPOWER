import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "Checkout | ColdPower", description: "Confirma los datos de tu pedido y reserva stock real en ColdPower." };
export default function CheckoutPage() { return <section className="bg-background py-12 sm:py-16"><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Compra online</p><h1 className="mt-3 font-display text-4xl font-black text-dark">Confirmar pedido</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-gray-text">El pedido se crea solo cuando existen precio retail vigente, moneda única y stock disponible en un local real.</p><div className="mt-8"><CheckoutForm /></div></div></section>; }
