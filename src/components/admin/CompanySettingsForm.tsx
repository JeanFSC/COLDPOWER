"use client";

import { useEffect, useState } from "react";

type CompanySettings = {
  legalName?: string | null; tradeName?: string | null; commercialName?: string | null; ruc?: string | null;
  country?: string | null; department?: string | null; province?: string | null; district?: string | null; address?: string | null;
  phone?: string | null; phones?: string[] | null; whatsapp?: string | null; email?: string | null; salesEmail?: string | null;
  hours?: string | null; businessHours?: string | null; facebook?: string | null; instagram?: string | null; tiktok?: string | null;
  website?: string | null; socials?: Record<string, string> | null; locations?: Array<{ name: string; address?: string }> | null;
  paymentMethods?: string[] | null; guaranteeTerms?: string | null; coverage?: string | null; legalLinks?: Record<string, string> | null;
  version?: number;
};

type FormState = {
  version: number;
  legalName: string; tradeName: string; commercialName: string; ruc: string; country: string; department: string; province: string;
  district: string; address: string; phone: string; phones: string; whatsapp: string; email: string; salesEmail: string; hours: string;
  businessHours: string; facebook: string; instagram: string; tiktok: string; website: string; socials: string; locations: string;
  paymentMethods: string; guaranteeTerms: string; coverage: string; legalLinks: string;
};

const emptyState: FormState = {
  version: 0,
  legalName: "", tradeName: "", commercialName: "", ruc: "", country: "", department: "", province: "", district: "", address: "",
  phone: "", phones: "", whatsapp: "", email: "", salesEmail: "", hours: "", businessHours: "", facebook: "", instagram: "",
  tiktok: "", website: "", socials: "{}", locations: "[]", paymentMethods: "", guaranteeTerms: "", coverage: "", legalLinks: "{}",
};

function json(value: unknown, fallback: string) { try { return JSON.stringify(value ?? JSON.parse(fallback), null, 2); } catch { return fallback; } }
function toState(settings: CompanySettings, version = settings.version ?? 0): FormState {
  return {
    version,
    legalName: settings.legalName ?? "", tradeName: settings.tradeName ?? "", commercialName: settings.commercialName ?? "", ruc: settings.ruc ?? "",
    country: settings.country ?? "", department: settings.department ?? "", province: settings.province ?? "", district: settings.district ?? "",
    address: settings.address ?? "", phone: settings.phone ?? "", phones: settings.phones?.join("\n") ?? "", whatsapp: settings.whatsapp ?? "",
    email: settings.email ?? "", salesEmail: settings.salesEmail ?? "", hours: settings.hours ?? "", businessHours: settings.businessHours ?? "",
    facebook: settings.facebook ?? "", instagram: settings.instagram ?? "", tiktok: settings.tiktok ?? "", website: settings.website ?? "",
    socials: json(settings.socials, "{}"), locations: json(settings.locations, "[]"), paymentMethods: settings.paymentMethods?.join("\n") ?? "",
    guaranteeTerms: settings.guaranteeTerms ?? "", coverage: settings.coverage ?? "", legalLinks: json(settings.legalLinks, "{}"),
  };
}
function lines(value: string) { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
function parseJson(value: string, field: string) { try { return JSON.parse(value) as unknown; } catch { throw new Error(`${field} debe contener JSON válido.`); } }
const inputClass = "h-10 rounded-md border border-border bg-white px-3 text-sm text-dark outline-primary";
const textAreaClass = "min-h-24 rounded-md border border-border bg-white p-3 text-sm text-dark outline-primary";

export function CompanySettingsForm() {
  const [form, setForm] = useState<FormState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");

  useEffect(() => {
    void fetch("/api/admin/configuracion", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { settings?: CompanySettings; error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo cargar la configuración.");
      setForm(result.settings ? toState(result.settings, (result as { version?: number }).version) : emptyState);
    }).catch((error) => { setMessageKind("error"); setMessage(error instanceof Error ? error.message : "No se pudo cargar la configuración."); }).finally(() => setLoading(false));
  }, []);

  function update(field: keyof FormState, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setMessageKind("success");
    try {
      const body = {
        version: form.version,
        legalName: form.legalName, tradeName: form.tradeName, commercialName: form.commercialName, ruc: form.ruc, country: form.country,
        department: form.department, province: form.province, district: form.district, address: form.address, phone: form.phone,
        phones: lines(form.phones), whatsapp: form.whatsapp, email: form.email, salesEmail: form.salesEmail, hours: form.hours,
        businessHours: form.businessHours, facebook: form.facebook, instagram: form.instagram, tiktok: form.tiktok, website: form.website,
        socials: parseJson(form.socials, "{}"), locations: parseJson(form.locations, "[]"), paymentMethods: lines(form.paymentMethods),
        guaranteeTerms: form.guaranteeTerms, coverage: form.coverage, legalLinks: parseJson(form.legalLinks, "{}"),
      };
      const response = await fetch("/api/admin/configuracion", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { settings?: CompanySettings; error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo guardar la configuración.");
      if (result.settings) setForm(toState(result.settings, (result as { version?: number }).version));
      setMessage("Configuración guardada y auditada.");
    } catch (error) { setMessageKind("error"); setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración."); }
    finally { setBusy(false); }
  }

  if (loading) return <p className="mt-6 rounded-md border border-dashed border-border bg-white p-5 text-sm text-gray-text">Cargando configuración empresarial…</p>;
  const locationFields = ["country", "department", "province", "district"] as const;
  return <form id="company-settings-form" onSubmit={save} className="mt-6 grid gap-6 rounded-md border border-border bg-white p-5 shadow-card sm:p-6">
    <span id="company-general" className="scroll-mt-24" aria-hidden="true" />
    <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Datos legales y comerciales</p><p className="mt-2 text-sm leading-6 text-gray-text">Los campos vacíos permanecen ocultos en la web. Solo publica medios de pago y canales confirmados.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm font-bold text-dark">Razón social<input className={inputClass} value={form.legalName} onChange={(e) => update("legalName", e.target.value)} maxLength={200} /></label>
      <label className="grid gap-1 text-sm font-bold text-dark">Nombre comercial<input className={inputClass} value={form.commercialName} onChange={(e) => update("commercialName", e.target.value)} maxLength={200} /></label>
      <label className="grid gap-1 text-sm font-bold text-dark">Nombre de marca<input className={inputClass} value={form.tradeName} onChange={(e) => update("tradeName", e.target.value)} maxLength={200} /></label>
      <label className="grid gap-1 text-sm font-bold text-dark">RUC<input className={inputClass} value={form.ruc} onChange={(e) => update("ruc", e.target.value)} maxLength={40} /></label>
      <label className="grid gap-1 text-sm font-bold text-dark">Correo general<input className={inputClass} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={240} /></label>
      <label className="grid gap-1 text-sm font-bold text-dark">Correo de ventas<input className={inputClass} type="email" value={form.salesEmail} onChange={(e) => update("salesEmail", e.target.value)} maxLength={240} /></label>
      <label className="grid gap-1 text-sm font-bold text-dark">Teléfono principal<input className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} maxLength={40} /></label>
      <label className="grid gap-1 text-sm font-bold text-dark">WhatsApp<input className={inputClass} value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} maxLength={40} /></label>
      <label className="grid gap-1 text-sm font-bold text-dark sm:col-span-2">Dirección<input className={inputClass} value={form.address} onChange={(e) => update("address", e.target.value)} maxLength={2000} /></label>
    </div>
    <span id="company-contact" className="scroll-mt-24" aria-hidden="true" />
    <span id="company-addresses" className="scroll-mt-24" aria-hidden="true" />
    <span id="company-operation" className="scroll-mt-24" aria-hidden="true" />
    <div><p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">Ubicación y atención</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {locationFields.map((field) => <label key={field} className="grid gap-1 text-sm font-bold capitalize text-dark">{field}<input className={inputClass} value={form[field]} onChange={(e) => update(field, e.target.value)} maxLength={120} /></label>)}
      <label className="grid gap-1 text-sm font-bold text-dark">Horario corto<input className={inputClass} value={form.hours} onChange={(e) => update("hours", e.target.value)} maxLength={2000} /></label>
      <label className="grid gap-1 text-sm font-bold text-dark lg:col-span-3">Horario detallado<input className={inputClass} value={form.businessHours} onChange={(e) => update("businessHours", e.target.value)} maxLength={2000} /></label>
    </div></div>
    <span id="company-policies" className="scroll-mt-24" aria-hidden="true" />
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold text-dark">Teléfonos adicionales <span className="text-xs font-normal text-gray-text">Uno por línea</span><textarea className={textAreaClass} value={form.phones} onChange={(e) => update("phones", e.target.value)} /></label><label className="grid gap-1 text-sm font-bold text-dark">Formas de pago confirmadas <span className="text-xs font-normal text-gray-text">Una por línea</span><textarea className={textAreaClass} value={form.paymentMethods} onChange={(e) => update("paymentMethods", e.target.value)} /></label><label className="grid gap-1 text-sm font-bold text-dark">Cobertura<textarea className={textAreaClass} value={form.coverage} onChange={(e) => update("coverage", e.target.value)} /></label><label className="grid gap-1 text-sm font-bold text-dark">Garantía<textarea className={textAreaClass} value={form.guaranteeTerms} onChange={(e) => update("guaranteeTerms", e.target.value)} /></label></div>
    <span id="company-socials" className="scroll-mt-24" aria-hidden="true" />
    <span id="company-branding" className="scroll-mt-24" aria-hidden="true" />
    <div className="grid gap-4 lg:grid-cols-4"><label className="grid gap-1 text-sm font-bold text-dark">Facebook<input className={inputClass} value={form.facebook} onChange={(e) => update("facebook", e.target.value)} /></label><label className="grid gap-1 text-sm font-bold text-dark">Instagram<input className={inputClass} value={form.instagram} onChange={(e) => update("instagram", e.target.value)} /></label><label className="grid gap-1 text-sm font-bold text-dark">TikTok<input className={inputClass} value={form.tiktok} onChange={(e) => update("tiktok", e.target.value)} /></label><label className="grid gap-1 text-sm font-bold text-dark">Sitio web<input className={inputClass} value={form.website} onChange={(e) => update("website", e.target.value)} /></label></div>
    <div className="grid gap-4 lg:grid-cols-3"><label className="grid gap-1 text-sm font-bold text-dark">Redes sociales heredadas <span className="text-xs font-normal text-gray-text">JSON</span><textarea className={`${textAreaClass} font-mono text-xs`} value={form.socials} onChange={(e) => update("socials", e.target.value)} /></label><label className="grid gap-1 text-sm font-bold text-dark">Locales <span className="text-xs font-normal text-gray-text">JSON</span><textarea className={`${textAreaClass} font-mono text-xs`} value={form.locations} onChange={(e) => update("locations", e.target.value)} /></label><label className="grid gap-1 text-sm font-bold text-dark">Links legales <span className="text-xs font-normal text-gray-text">JSON</span><textarea className={`${textAreaClass} font-mono text-xs`} value={form.legalLinks} onChange={(e) => update("legalLinks", e.target.value)} /></label></div>
    <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={busy} className="rounded-md bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{busy ? "Guardando…" : "Guardar configuración"}</button>{message ? <p className="text-sm font-bold text-dark" role={messageKind === "error" ? "alert" : "status"} aria-live={messageKind === "error" ? "assertive" : "polite"}>{message}</p> : null}</div>
  </form>;
}
