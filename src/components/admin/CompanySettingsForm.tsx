"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronDown, Info, MessageCircle, Pencil, Upload } from "lucide-react";
import { COMPANY_SETTINGS_DISCARD_EVENT } from "@/components/admin/DiscardSettingsButton";
import { PERU_DEPARTMENTS, provincesForDepartment, districtsForProvince } from "@/lib/peru-ubigeo";

type CompanySettings = {
  legalName?: string | null; tradeName?: string | null; commercialName?: string | null; ruc?: string | null;
  country?: string | null; department?: string | null; province?: string | null; district?: string | null; address?: string | null;
  phone?: string | null; phones?: string[] | null; whatsapp?: string | null; email?: string | null; salesEmail?: string | null;
  hours?: string | null; businessHours?: string | null; facebook?: string | null; instagram?: string | null; tiktok?: string | null;
  website?: string | null; socials?: Record<string, string> | null; locations?: Array<{ name: string; address?: string }> | null;
  paymentMethods?: string[] | null; guaranteeTerms?: string | null; coverage?: string | null; legalLinks?: Record<string, string> | null; legalPagesPublished?: boolean | null;
  logoMediaId?: string | null; faviconMediaId?: string | null; primaryColor?: string | null; secondaryColor?: string | null;
  version?: number;
};

type KeyValueRow = { key: string; value: string };
type LocationRow = { name: string; address: string };

type FormState = {
  version: number;
  legalName: string; tradeName: string; commercialName: string; ruc: string; country: string; department: string; province: string;
  district: string; address: string; phone: string; phones: string; whatsapp: string; email: string; salesEmail: string; hours: string;
  businessHours: string; facebook: string; instagram: string; tiktok: string; website: string; socialRows: KeyValueRow[]; locationRows: LocationRow[];
  paymentMethods: string; guaranteeTerms: string; coverage: string; legalLinkRows: KeyValueRow[]; legalPagesPublished: boolean;
  logoMediaId: string; faviconMediaId: string; primaryColor: string; secondaryColor: string;
};

const emptyState: FormState = {
  version: 0,
  legalName: "", tradeName: "", commercialName: "", ruc: "", country: "", department: "", province: "", district: "", address: "",
  phone: "", phones: "", whatsapp: "", email: "", salesEmail: "", hours: "", businessHours: "", facebook: "", instagram: "",
  tiktok: "", website: "", socialRows: [], locationRows: [], paymentMethods: "", guaranteeTerms: "", coverage: "", legalLinkRows: [], legalPagesPublished: false,
  logoMediaId: "", faviconMediaId: "", primaryColor: "", secondaryColor: "",
};

function keyValueRows(value: Record<string, string> | null | undefined): KeyValueRow[] { return Object.entries(value ?? {}).map(([key, rowValue]) => ({ key, value: rowValue })); }
function toState(settings: CompanySettings, version = settings.version ?? 0): FormState {
  return {
    version,
    legalName: settings.legalName ?? "", tradeName: settings.tradeName ?? "", commercialName: settings.commercialName ?? "", ruc: settings.ruc ?? "",
    country: settings.country ?? "", department: settings.department ?? "", province: settings.province ?? "", district: settings.district ?? "",
    address: settings.address ?? "", phone: settings.phone ?? "", phones: settings.phones?.join("\n") ?? "", whatsapp: settings.whatsapp ?? "",
    email: settings.email ?? "", salesEmail: settings.salesEmail ?? "", hours: settings.hours ?? "", businessHours: settings.businessHours ?? "",
    facebook: settings.facebook ?? "", instagram: settings.instagram ?? "", tiktok: settings.tiktok ?? "", website: settings.website ?? "",
    socialRows: keyValueRows(settings.socials), locationRows: (settings.locations ?? []).map((location) => ({ name: location.name ?? "", address: location.address ?? "" })), paymentMethods: settings.paymentMethods?.join("\n") ?? "",
    guaranteeTerms: settings.guaranteeTerms ?? "", coverage: settings.coverage ?? "", legalLinkRows: keyValueRows(settings.legalLinks), legalPagesPublished: settings.legalPagesPublished === true,
    logoMediaId: settings.logoMediaId ?? "", faviconMediaId: settings.faviconMediaId ?? "", primaryColor: settings.primaryColor ?? "", secondaryColor: settings.secondaryColor ?? "",
  };
}
function lines(value: string) { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
const inputClass = "h-10 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";
const colorInputClass = "h-10 w-full max-w-[140px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";
const extendedInputClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";
const extendedTextAreaClass = "min-h-28 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

export function CompanySettingsForm({ belowGeneral, belowBranding, canPublishLegalPages = false }: { belowGeneral?: ReactNode; belowBranding?: ReactNode; canPublishLegalPages?: boolean } = {}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyState);
  const [initialForm, setInitialForm] = useState<FormState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"logoMediaId" | "faviconMediaId" | null>(null);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");

  useEffect(() => {
    void fetch("/api/admin/configuracion", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { settings?: CompanySettings; error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo cargar la configuración.");
      const nextForm = result.settings ? toState(result.settings, (result as { version?: number }).version) : emptyState;
      setForm(nextForm);
      setInitialForm(nextForm);
    }).catch((error) => { setMessageKind("error"); setMessage(error instanceof Error ? error.message : "No se pudo cargar la configuración."); }).finally(() => setLoading(false));
  }, []);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const onDiscard = () => { setForm(initialForm); setMessage(""); };
    window.addEventListener(COMPANY_SETTINGS_DISCARD_EVENT, onDiscard);
    return () => window.removeEventListener(COMPANY_SETTINGS_DISCARD_EVENT, onDiscard);
  }, [initialForm]);

  function update(field: keyof FormState, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  function updateDepartment(value: string) { setForm((current) => ({ ...current, department: value, province: "", district: "" })); }
  function updateProvince(value: string) { setForm((current) => ({ ...current, province: value, district: "" })); }
  function updateKeyValueRow(field: "socialRows" | "legalLinkRows", index: number, property: keyof KeyValueRow, value: string) {
    setForm((current) => ({ ...current, [field]: current[field].map((row, rowIndex) => rowIndex === index ? { ...row, [property]: value } : row) }));
  }
  function addRow(field: "socialRows" | "legalLinkRows") { setForm((current) => ({ ...current, [field]: [...current[field], { key: "", value: "" }] })); }
  function removeRow(field: "socialRows" | "legalLinkRows", index: number) { setForm((current) => ({ ...current, [field]: current[field].filter((_, rowIndex) => rowIndex !== index) })); }
  async function uploadBrandingAsset(field: "logoMediaId" | "faviconMediaId", file: File) {
    setUploading(field);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const result = await response.json() as { asset?: { id: string }; error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo subir el archivo.");
      if (result.asset) update(field, result.asset.id);
    } catch (error) { setMessageKind("error"); setMessage(error instanceof Error ? error.message : "No se pudo subir el archivo."); }
    finally { setUploading(null); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setMessageKind("success");
    try {
      const body = {
        version: form.version,
        legalName: form.legalName, tradeName: form.tradeName, commercialName: form.commercialName, ruc: form.ruc, country: form.country,
        department: form.department, province: form.province, district: form.district, address: form.address, phone: form.phone,
        phones: lines(form.phones), whatsapp: form.whatsapp, email: form.email, salesEmail: form.salesEmail, hours: form.hours,
        businessHours: form.businessHours, facebook: form.facebook, instagram: form.instagram, tiktok: form.tiktok, website: form.website,
        socials: Object.fromEntries(form.socialRows.filter((row) => row.key.trim() && row.value.trim()).map((row) => [row.key.trim(), row.value.trim()])),
        paymentMethods: lines(form.paymentMethods), guaranteeTerms: form.guaranteeTerms, coverage: form.coverage,
        legalLinks: Object.fromEntries(form.legalLinkRows.filter((row) => row.key.trim() && row.value.trim()).map((row) => [row.key.trim(), row.value.trim()])),
        ...(canPublishLegalPages ? { legalPagesPublished: form.legalPagesPublished } : {}),
        logoMediaId: form.logoMediaId || null, faviconMediaId: form.faviconMediaId || null, primaryColor: form.primaryColor || null, secondaryColor: form.secondaryColor || null,
      };
      const response = await fetch("/api/admin/configuracion", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { settings?: CompanySettings; error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo guardar la configuración.");
      if (result.settings) { const nextForm = toState(result.settings, (result as { version?: number }).version); setForm(nextForm); setInitialForm(nextForm); }
      setMessage("Configuración guardada y auditada.");
      router.refresh();
    } catch (error) { setMessageKind("error"); setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración."); }
    finally { setBusy(false); }
  }

  if (loading) return <p className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">Cargando configuración empresarial…</p>;
  const provinceOptions = form.department ? provincesForDepartment(form.department) : [];
  const districtOptions = form.department && form.province ? districtsForProvince(form.department, form.province) : [];
  return <form id="company-settings-form" onSubmit={save} className="grid gap-4">
    <div className="grid items-start gap-6 xl:grid-cols-12">
      <div className="grid content-start gap-6 xl:col-span-8">
      <section id="company-general" className="scroll-mt-24 rounded-xl border border-border bg-white p-6 shadow-card">
        <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold text-dark">Información de la empresa<Info className="h-3.5 w-3.5 text-gray-text" aria-hidden="true" /></h2>
        <p className="mt-1 text-xs leading-5 text-gray-text">Datos generales de tu empresa que se mostrarán en documentos y comunicaciones. Los campos vacíos permanecen ocultos en la web.</p>
        <div className="mt-4 grid gap-6 xl:grid-cols-12">
        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-8">
          <label className="grid gap-1 text-sm font-bold text-dark">Razón social <span className="text-red-500">*</span><input className={inputClass} value={form.legalName} onChange={(e) => update("legalName", e.target.value)} maxLength={200} /></label>
          <label className="grid gap-1 text-sm font-bold text-dark">Nombre comercial<input className={inputClass} value={form.commercialName} onChange={(e) => update("commercialName", e.target.value)} maxLength={200} /></label>
          <label className="grid gap-1 text-sm font-bold text-dark">RUC <span className="text-red-500">*</span><input className={inputClass} value={form.ruc} onChange={(e) => update("ruc", e.target.value)} maxLength={40} /></label>
          <label className="grid gap-1 text-sm font-bold text-dark">Página web<input className={inputClass} value={form.website} onChange={(e) => update("website", e.target.value)} /></label>
          <label className="grid gap-1 text-sm font-bold text-dark">Correo electrónico <span className="text-red-500">*</span><input className={inputClass} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={240} /></label>
          <label className="grid gap-1 text-sm font-bold text-dark">Dirección fiscal <span className="text-red-500">*</span><input className={inputClass} value={form.address} onChange={(e) => update("address", e.target.value)} maxLength={2000} /></label>
          <label className="grid gap-1 text-sm font-bold text-dark">Teléfono principal <span className="text-red-500">*</span>
            <div className="flex items-center gap-1.5">
              <span className="flex h-10 shrink-0 items-center gap-1 rounded-md border border-border bg-[#fbfcfd] px-2 text-sm text-gray-text">🇵🇪 +51</span>
              <input className={`${inputClass} flex-1`} value={form.phone} onChange={(e) => update("phone", e.target.value)} maxLength={40} />
            </div>
          </label>
          <label className="grid gap-1 text-sm font-bold text-dark">WhatsApp
            <div className="flex items-center gap-1.5">
              <span className="flex h-10 shrink-0 items-center gap-1 rounded-md border border-border bg-[#fbfcfd] px-2 text-sm text-gray-text">🇵🇪 +51</span>
              <input className={`${inputClass} flex-1`} value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} maxLength={40} />
              {form.whatsapp.trim() ? (
                <a href={`https://wa.me/${form.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" aria-label="Abrir chat de WhatsApp" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#25d366] text-white transition hover:bg-[#20bd5a]">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </label>
          <label className="grid gap-1 text-sm font-bold text-dark">País
            <select className={inputClass} value={form.country} onChange={(e) => update("country", e.target.value)}>
              <option value="">Selecciona…</option>
              <option value="Perú">Perú</option>
              {form.country && form.country !== "Perú" ? <option value={form.country}>{form.country}</option> : null}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-dark">Departamento
            <select className={inputClass} value={form.department} onChange={(e) => updateDepartment(e.target.value)}>
              <option value="">Selecciona…</option>
              {PERU_DEPARTMENTS.map((name) => <option key={name} value={name}>{name}</option>)}
              {form.department && !PERU_DEPARTMENTS.includes(form.department) ? <option value={form.department}>{form.department}</option> : null}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-dark">Provincia
            <select className={inputClass} value={form.province} onChange={(e) => updateProvince(e.target.value)} disabled={!form.department}>
              <option value="">{form.department ? "Selecciona…" : "Selecciona un departamento primero"}</option>
              {provinceOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              {form.province && !provinceOptions.includes(form.province) ? <option value={form.province}>{form.province}</option> : null}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-dark">Distrito
            <select className={inputClass} value={form.district} onChange={(e) => update("district", e.target.value)} disabled={!form.province}>
              <option value="">{form.province ? "Selecciona…" : "Selecciona una provincia primero"}</option>
              {districtOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              {form.district && !districtOptions.includes(form.district) ? <option value={form.district}>{form.district}</option> : null}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-dark sm:col-span-2">Horario de atención<input className={inputClass} value={form.hours} onChange={(e) => update("hours", e.target.value)} maxLength={2000} placeholder="Lun - Vie: 8:00 a.m. - 6:00 p.m." /></label>
        </div>
        <div id="company-branding" className="scroll-mt-24 w-full xl:col-span-4">
          <div className="rounded-xl border border-border bg-[#fbfcfd] p-4">
            <h3 className="text-[15px] font-extrabold text-dark">Logo y branding</h3>
            <p className="mt-1 text-xs leading-5 text-gray-text">Identidad visual de tu empresa.</p>
            <div className="mt-4 grid gap-1.5">
              <span className="text-sm font-bold text-dark">Logo</span>
              <div className="relative flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-white p-4">
                {form.logoMediaId ? <Image src={`/api/media/${form.logoMediaId}`} alt="Logo" width={140} height={72} className="h-16 max-w-full object-contain" /> : <span className="flex h-16 items-center justify-center text-[9px] font-semibold text-gray-text">Sin logo</span>}
                <label className="absolute bottom-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-[#1d63c9]" aria-label="Cambiar logo">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" disabled={uploading !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadBrandingAsset("logoMediaId", file); e.target.value = ""; }} />
                </label>
                {uploading === "logoMediaId" ? <span className="text-[10px] text-primary">Subiendo…</span> : null}
                <span className="text-[10px] text-gray-text">Formatos: PNG, JPG o SVG. Máx. 2MB.</span>
              </div>
            </div>
            <div className="mt-4 grid gap-1.5">
              <span className="text-sm font-bold text-dark">Favicon</span>
              <div className="flex items-center gap-3">
                {form.faviconMediaId ? <Image src={`/api/media/${form.faviconMediaId}`} alt="Favicon" width={32} height={32} className="h-8 w-8 shrink-0 rounded-md border border-border bg-white object-contain p-1" /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-[8px] font-semibold text-gray-text">N/D</span>}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-[#f5f9ff]">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  {uploading === "faviconMediaId" ? "Subiendo…" : "Cambiar favicon"}
                  <input type="file" accept="image/png,image/x-icon,image/svg+xml" className="hidden" disabled={uploading !== null} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadBrandingAsset("faviconMediaId", file); e.target.value = ""; }} />
                </label>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-bold text-dark">Color principal
                <div className="flex items-center gap-1.5">
                  <div className="relative shrink-0">
                    <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.primaryColor) ? form.primaryColor : "#2277ee"} onChange={(e) => update("primaryColor", e.target.value)} className="h-10 w-10 cursor-pointer rounded-md border border-border bg-white p-1" aria-label="Selector de color principal" />
                    <Pencil className="pointer-events-none absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border border-border bg-white p-0.5 text-gray-text" aria-hidden="true" />
                  </div>
                  <input className={colorInputClass} value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} placeholder="#2563EB" maxLength={7} />
                </div>
              </label>
              <label className="grid gap-1 text-sm font-bold text-dark">Color secundario
                <div className="flex items-center gap-1.5">
                  <div className="relative shrink-0">
                    <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.secondaryColor) ? form.secondaryColor : "#0ea5e9"} onChange={(e) => update("secondaryColor", e.target.value)} className="h-10 w-10 cursor-pointer rounded-md border border-border bg-white p-1" aria-label="Selector de color secundario" />
                    <Pencil className="pointer-events-none absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border border-border bg-white p-0.5 text-gray-text" aria-hidden="true" />
                  </div>
                  <input className={colorInputClass} value={form.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} placeholder="#0EA5E9" maxLength={7} />
                </div>
              </label>
            </div>
          </div>
        </div>
        </div>
      </section>
      {belowGeneral}
      </div>
      <div className="grid content-start gap-6 xl:col-span-4">
      {belowBranding}
      </div>
    </div>
    <details className="group overflow-hidden rounded-xl border border-border bg-white shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <div><p className="text-sm font-extrabold text-dark">Configuración complementaria</p><p className="mt-1 text-xs text-gray-text">Marca, operación comercial, canales y enlaces institucionales.</p></div>
        <span className="inline-flex items-center gap-2 rounded-lg bg-[#f5f9ff] px-3 py-2 text-xs font-extrabold text-primary">Personalizar <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></span>
      </summary>
      <div className="border-t border-[#e8eef4] bg-[#fbfcfd] p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-12">
          <section className="rounded-xl border border-border bg-white p-5 xl:col-span-5"><h3 className="text-sm font-extrabold text-dark">Identidad y contacto</h3><p className="mt-1 text-xs text-gray-text">Datos comerciales que verán tus clientes.</p><div className="mt-4 grid gap-4"><label className="grid gap-1.5 text-sm font-bold text-dark">Nombre de marca<input className={extendedInputClass} value={form.tradeName} onChange={(e) => update("tradeName", e.target.value)} maxLength={200} /></label><label className="grid gap-1.5 text-sm font-bold text-dark">Correo de ventas<input className={extendedInputClass} type="email" value={form.salesEmail} onChange={(e) => update("salesEmail", e.target.value)} maxLength={240} /></label><label className="grid gap-1.5 text-sm font-bold text-dark">Horario detallado<input className={extendedInputClass} value={form.businessHours} onChange={(e) => update("businessHours", e.target.value)} maxLength={2000} /></label></div></section>
          <section className="rounded-xl border border-border bg-white p-5 xl:col-span-7"><h3 className="text-sm font-extrabold text-dark">Operación comercial</h3><p className="mt-1 text-xs text-gray-text">Condiciones confirmadas para ventas, cobertura y postventa.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="grid gap-1.5 text-sm font-bold text-dark">Teléfonos adicionales <span className="text-xs font-normal text-gray-text">Uno por línea</span><textarea className={extendedTextAreaClass} value={form.phones} onChange={(e) => update("phones", e.target.value)} /></label><label className="grid gap-1.5 text-sm font-bold text-dark">Formas de pago confirmadas <span className="text-xs font-normal text-gray-text">Una por línea</span><textarea className={extendedTextAreaClass} value={form.paymentMethods} onChange={(e) => update("paymentMethods", e.target.value)} /></label><label className="grid gap-1.5 text-sm font-bold text-dark">Cobertura<textarea className={extendedTextAreaClass} value={form.coverage} onChange={(e) => update("coverage", e.target.value)} /></label><label className="grid gap-1.5 text-sm font-bold text-dark">Garantía<textarea className={extendedTextAreaClass} value={form.guaranteeTerms} onChange={(e) => update("guaranteeTerms", e.target.value)} /></label></div></section>
          <section className="rounded-xl border border-border bg-white p-5 xl:col-span-12"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-extrabold text-dark">Canales y enlaces</h3><p className="mt-1 text-xs text-gray-text">Centraliza los puntos de contacto públicos e institucionales.</p></div></div><div className="mt-4 grid gap-4 lg:grid-cols-3"><label className="grid gap-1.5 text-sm font-bold text-dark">Facebook<input className={extendedInputClass} value={form.facebook} onChange={(e) => update("facebook", e.target.value)} /></label><label className="grid gap-1.5 text-sm font-bold text-dark">Instagram<input className={extendedInputClass} value={form.instagram} onChange={(e) => update("instagram", e.target.value)} /></label><label className="grid gap-1.5 text-sm font-bold text-dark">TikTok<input className={extendedInputClass} value={form.tiktok} onChange={(e) => update("tiktok", e.target.value)} /></label></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><section className="rounded-xl border border-[#e4ebf2] bg-[#fbfcfd] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-dark">Redes sociales heredadas</p><p className="mt-1 text-xs text-gray-text">Canal y URL, una fila por red.</p></div><button type="button" onClick={() => addRow("socialRows")} className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary hover:bg-[#f5f9ff]">Agregar</button></div><div className="mt-3 grid gap-2">{form.socialRows.map((row, index) => <div key={`social-${index}`} className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr_auto]"><input aria-label={`Nombre de red ${index + 1}`} className={extendedInputClass} placeholder="Instagram" value={row.key} onChange={(e) => updateKeyValueRow("socialRows", index, "key", e.target.value)} /><input aria-label={`URL de red ${index + 1}`} className={extendedInputClass} placeholder="https://…" value={row.value} onChange={(e) => updateKeyValueRow("socialRows", index, "value", e.target.value)} /><button type="button" aria-label={`Eliminar red ${index + 1}`} onClick={() => removeRow("socialRows", index)} className="h-10 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600">Eliminar</button></div>)}{!form.socialRows.length ? <p className="rounded-lg border border-dashed border-border p-3 text-xs text-gray-text">No hay redes heredadas registradas.</p> : null}</div></section><section className="rounded-xl border border-[#e4ebf2] bg-[#fbfcfd] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-dark">Enlaces legales</p><p className="mt-1 text-xs text-gray-text">Etiqueta y URL, una fila por enlace.</p></div><button type="button" onClick={() => addRow("legalLinkRows")} className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-primary hover:bg-[#f5f9ff]">Agregar</button></div><div className="mt-3 grid gap-2">{form.legalLinkRows.map((row, index) => <div key={`legal-link-${index}`} className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr_auto]"><input aria-label={`Etiqueta legal ${index + 1}`} className={extendedInputClass} placeholder="Términos" value={row.key} onChange={(e) => updateKeyValueRow("legalLinkRows", index, "key", e.target.value)} /><input aria-label={`URL legal ${index + 1}`} className={extendedInputClass} placeholder="/terminos" value={row.value} onChange={(e) => updateKeyValueRow("legalLinkRows", index, "value", e.target.value)} /><button type="button" aria-label={`Eliminar enlace legal ${index + 1}`} onClick={() => removeRow("legalLinkRows", index)} className="h-10 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-600">Eliminar</button></div>)}{!form.legalLinkRows.length ? <p className="rounded-lg border border-dashed border-border p-3 text-xs text-gray-text">No hay enlaces legales registrados.</p> : null}</div></section></div></section>
        </div>
      </div>
    </details>
    {canPublishLegalPages ? <section id="company-legal-publication" className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-extrabold text-dark">Publicación legal</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">Activa las páginas legales después de completar y validar los campos marcados como [DEFINIR]. El cambio queda registrado en auditoría.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-800">Solo SUPERADMIN</span>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-white p-4">
        <input type="checkbox" checked={form.legalPagesPublished} onChange={(event) => setForm((current) => ({ ...current, legalPagesPublished: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-primary" />
        <span><span className="block text-sm font-extrabold text-dark">Publicar páginas legales</span><span className="mt-1 block text-xs leading-5 text-gray-text">Mientras esté desactivado, las rutas devuelven 404 y el footer no muestra enlaces legales.</span></span>
      </label>
    </section> : null}
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-card"><button type="submit" disabled={busy || !isDirty} className="rounded-md bg-primary px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{busy ? "Guardando…" : "Guardar configuración"}</button><button type="button" disabled={!isDirty || busy} onClick={() => { setForm(initialForm); setMessage(""); }} className="rounded-md border border-border px-4 py-2.5 text-sm font-extrabold text-dark disabled:opacity-50">Descartar cambios</button>{isDirty ? <span className="text-xs font-semibold text-[#9a5c16]">Cambios sin guardar</span> : null}{message ? <p className="text-sm font-bold text-dark" role={messageKind === "error" ? "alert" : "status"} aria-live={messageKind === "error" ? "assertive" : "polite"}>{message}</p> : null}</div>
  </form>;
}
