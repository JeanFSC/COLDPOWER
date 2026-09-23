import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { locations, users } from "@/db/schema";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getOptionalUserId } from "@/lib/auth";
import { CART_SESSION_COOKIE, readCartView } from "@/lib/shopping-cart-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", description: "Elige la entrega, confirma tus datos y paga tu pedido en ColdPower." };

export default async function CheckoutPage() {
  const userId = await getOptionalUserId();
  if (!userId) redirect("/sign-in?redirect_url=%2Fcheckout");
  const sessionToken = (await cookies()).get(CART_SESSION_COOKIE)?.value ?? crypto.randomUUID();
  const db = getDb();
  const [cart, locationRows, [profile]] = await Promise.all([
    readCartView({ sessionToken, userId }),
    db.select({ id: locations.id, name: locations.name, address: locations.address, city: locations.city }).from(locations).where(eq(locations.active, true)).orderBy(asc(locations.name)),
    db.select({ name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1),
  ]);

  return (
    <section className="bg-background py-10 sm:py-14">
      <div className="cp-container">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Compra online</p>
        <h1 className="mt-3 font-display text-4xl font-black text-dark">Finalizar compra</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-text">Al confirmar reservamos el stock por un tiempo limitado mientras completas el pago.</p>
        <div className="mt-8">
          <CheckoutForm cart={cart} locations={locationRows} defaults={{ name: profile?.name ?? "", email: profile?.email ?? "", phone: profile?.phone ?? "" }} />
        </div>
      </div>
    </section>
  );
}
