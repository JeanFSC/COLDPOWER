import type { Metadata } from "next";
import { Mail, MapPin, Phone, ReceiptText } from "lucide-react";
import { AccountProfileEditor } from "@/components/account/AccountProfileEditor";
import { getAccountOverview } from "@/lib/account-overview";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis datos | ColdPower", description: "Consulta y actualiza tus datos de cuenta ColdPower." };

function valueOrFallback(value: string | null | undefined) {
  return value?.trim() || "No registrada";
}

export default async function CuentaDatosPage() {
  const { userId, role } = await requireUser();
  const overview = await getAccountOverview(userId, role);

  const { profile } = overview;
  return (
    <div className="account-subpage">
      <header className="account-subpage-header">
        <div>
          <p className="account-eyebrow">Información de cuenta</p>
          <h1 className="account-h1">Mis datos</h1>
          <p className="account-subtitle">Mantén actualizados tus datos de contacto y la información necesaria para tus compras.</p>
        </div>
        <AccountProfileEditor profile={profile} buttonLabel="Editar información" />
      </header>

      <div className="account-subpage-card mt-3">
        <div className="account-subpage-row">
          <div><p className="account-eyebrow">Contacto</p><h2 className="mt-1">Datos de la cuenta</h2></div>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-[#fbfdff] p-3"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.08em] text-gray-text"><Mail className="h-4 w-4 text-primary" aria-hidden="true" />Correo</p><p className="mt-2 text-sm font-bold text-dark">{valueOrFallback(profile.email)}</p></div>
          <div className="rounded-lg border border-border bg-[#fbfdff] p-3"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.08em] text-gray-text"><Phone className="h-4 w-4 text-primary" aria-hidden="true" />Teléfono</p><p className="mt-2 text-sm font-bold text-dark">{valueOrFallback(profile.phone)}</p></div>
          <div className="rounded-lg border border-border bg-[#fbfdff] p-3"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.08em] text-gray-text"><ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />Empresa</p><p className="mt-2 text-sm font-bold text-dark">{valueOrFallback(profile.companyName)}</p></div>
          <div className="rounded-lg border border-border bg-[#fbfdff] p-3"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.08em] text-gray-text"><MapPin className="h-4 w-4 text-primary" aria-hidden="true" />Dirección</p><p className="mt-2 text-sm font-bold text-dark">{valueOrFallback(profile.primaryAddress?.address)}</p><p className="mt-1 text-xs text-gray-text">{profile.primaryAddress?.location || "Ubicación no registrada"}</p></div>
        </div>
      </div>

      <p className="account-privacy-note"><span><strong>Tu información se guarda en tu cuenta autenticada.</strong> Las operaciones comerciales se filtran en servidor por el usuario titular.</span></p>
    </div>
  );
}
