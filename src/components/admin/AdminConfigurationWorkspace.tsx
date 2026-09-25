"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock3,
  History,
  Link2,
  MapPin,
  Palette,
  PlugZap,
  Plus,
  ReceiptText,
  Save,
  Settings2,
  Upload,
  X,
} from "lucide-react";
import { CompanySettingsHistoryPanel } from "@/components/admin/CompanySettingsHistoryPanel";
import { TestIntegrationsButton } from "@/components/admin/TestIntegrationsButton";
import type { CompanySettings } from "@/lib/company-settings";
import { isValidPeruvianRuc } from "@/lib/peru-documents";
import { PERU_DEPARTMENTS, districtsForProvince, provincesForDepartment } from "@/lib/peru-ubigeo";
import type { PriceListSummary } from "@/lib/price-lists";
import type { DocumentSeriesRow } from "@/lib/document-series";
import type { IntegrationRow } from "@/lib/integrations";

type ConfigTab = "empresa" | "locales" | "series" | "precios" | "integraciones" | "branding" | "legal" | "historial";
type KeyValueRow = { key: string; value: string };
type LocationRow = { id: string; code: string; name: string; type: string; address: string | null; city: string | null; active: boolean };
type Summary = { version: number | null; updatedAt?: Date | null; legalName?: string | null; tradeName?: string | null; ruc?: string | null; locations: number | null; paymentMethods: number | null; logoMediaId?: string | null; contactMethods: number };

type FormState = {
  version: number;
  legalName: string;
  tradeName: string;
  commercialName: string;
  ruc: string;
  country: string;
  department: string;
  province: string;
  district: string;
  address: string;
  phone: string;
  phones: string;
  whatsapp: string;
  email: string;
  salesEmail: string;
  hours: string;
  businessHours: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  website: string;
  socialRows: KeyValueRow[];
  paymentMethods: string;
  guaranteeTerms: string;
  coverage: string;
  legalLinkRows: KeyValueRow[];
  legalPagesPublished: boolean;
  logoMediaId: string;
  faviconMediaId: string;
  primaryColor: string;
  secondaryColor: string;
  taxRate: string;
  taxMode: "" | "INCLUDED" | "EXCLUDED";
};

const emptyState: FormState = {
  version: 0, legalName: "", tradeName: "", commercialName: "", ruc: "", country: "", department: "", province: "", district: "", address: "",
  phone: "", phones: "", whatsapp: "", email: "", salesEmail: "", hours: "", businessHours: "", facebook: "", instagram: "", tiktok: "", website: "",
  socialRows: [], paymentMethods: "", guaranteeTerms: "", coverage: "", legalLinkRows: [], legalPagesPublished: false, logoMediaId: "", faviconMediaId: "", primaryColor: "", secondaryColor: "", taxRate: "", taxMode: "",
};

const card = "rounded-[14px] border border-[#dce6ee] bg-white shadow-[0_1px_2px_rgba(16,42,67,0.03)]";
const input = "h-10 w-full rounded-lg border border-[#d5e0e9] bg-white px-3 text-[13px] font-semibold text-[#173654] outline-none transition placeholder:text-[#94a7b8] focus:border-[#2277ee] focus:ring-2 focus:ring-[#2277ee]/10 disabled:cursor-not-allowed disabled:bg-[#f5f8fa]";
const select = `${input} appearance-none`;
const primaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-3.5 text-[12px] font-extrabold text-white shadow-[0_5px_12px_rgba(37,99,235,0.18)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d5e0e9] bg-white px-3.5 text-[12px] font-extrabold text-[#2d4862] transition hover:border-[#9eb7ce] hover:bg-[#f7fafc] disabled:cursor-not-allowed disabled:opacity-50";

function keyValueRows(value: Record<string, string> | null | undefined): KeyValueRow[] {
  return Object.entries(value ?? {}).map(([key, rowValue]) => ({ key, value: rowValue }));
}

function toState(settings: CompanySettings | undefined, version = 0): FormState {
  return {
    version,
    legalName: settings?.legalName ?? "", tradeName: settings?.tradeName ?? "", commercialName: settings?.commercialName ?? "", ruc: settings?.ruc ?? "",
    country: settings?.country ?? "", department: settings?.department ?? "", province: settings?.province ?? "", district: settings?.district ?? "", address: settings?.address ?? "",
    phone: settings?.phone ?? "", phones: settings?.phones?.join("\n") ?? "", whatsapp: settings?.whatsapp ?? "", email: settings?.email ?? "", salesEmail: settings?.salesEmail ?? "", hours: settings?.hours ?? "", businessHours: settings?.businessHours ?? "",
    facebook: settings?.facebook ?? "", instagram: settings?.instagram ?? "", tiktok: settings?.tiktok ?? "", website: settings?.website ?? "", socialRows: keyValueRows(settings?.socials),
    paymentMethods: settings?.paymentMethods?.join("\n") ?? "", guaranteeTerms: settings?.guaranteeTerms ?? "", coverage: settings?.coverage ?? "", legalLinkRows: keyValueRows(settings?.legalLinks), legalPagesPublished: settings?.legalPagesPublished === true,
    logoMediaId: settings?.logoMediaId ?? "", faviconMediaId: settings?.faviconMediaId ?? "", primaryColor: settings?.primaryColor ?? "", secondaryColor: settings?.secondaryColor ?? "", taxRate: settings?.taxRate ?? "", taxMode: settings?.taxMode === "INCLUDED" || settings?.taxMode === "EXCLUDED" ? settings.taxMode : "",
  };
}

function lines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "Sin cambios registrados";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sin fecha registrada" : date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(value: string | null | undefined) {
  if (value === "CONNECTED") return "Conectada";
  if (value === "DISCONNECTED") return "No disponible";
  if (value === "TESTING") return "Probando";
  return "Sin configurar";
}

function TextField({ label, value, onChange, required, help, type = "text", maxLength }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; help?: string; type?: string; maxLength?: number }) {
  return <label className="grid gap-1.5 text-[12px] font-extrabold text-[#304b66]"><span>{label} {required ? <span className="text-[#d94848]" aria-hidden="true">*</span> : null}</span><input type={type} value={value} onChange={(event) => onChange(event.currentTarget.value)} className={input} maxLength={maxLength} /><span className="min-h-4 text-[11px] font-semibold leading-4 text-[#8296a9]">{help ?? ""}</span></label>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-[#dce6ee] bg-[#fbfcfd] p-6 text-center"><p className="text-[13px] font-extrabold text-[#304b66]">{title}</p><p className="mt-1 text-[12px] font-semibold leading-5 text-[#8296a9]">{detail}</p></div>;
}

export function AdminConfigurationWorkspace({ summary, locationRows, locationsTotal, priceLists, documentSeries, integrations, canManageIntegrations, canManageTax, canPublishLegalPages }: { summary?: Summary; locationRows: LocationRow[]; locationsTotal: number; priceLists: PriceListSummary[]; documentSeries: DocumentSeriesRow[]; integrations: IntegrationRow[]; canManageIntegrations: boolean; canManageTax: boolean; canPublishLegalPages: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<ConfigTab>("empresa");
  const [form, setForm] = useState<FormState>(emptyState);
  const [initialForm, setInitialForm] = useState<FormState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"logoMediaId" | "faviconMediaId" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/configuracion", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { settings?: CompanySettings; version?: number; error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo cargar la configuración.");
      const next = toState(result.settings, result.version ?? 0);
      setForm(next);
      setInitialForm(next);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar la configuración.")).finally(() => setLoading(false));
  }, []);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const rucForPeru = /^(PE|PERU|PERÚ|PERUVIAN)$/i.test(form.country.trim());
  const rucInvalid = Boolean(form.ruc.trim() && rucForPeru && !isValidPeruvianRuc(form.ruc));
  const provinces = form.department ? provincesForDepartment(form.department) : [];
  const districts = form.department && form.province ? districtsForProvince(form.department, form.province) : [];
  const configuredCompanyFields = [form.legalName, form.ruc, form.address, form.phone, form.email, form.salesEmail].filter((value) => value.trim()).length;
  const connectedIntegrations = integrations.filter((row) => row.lastCheckedStatus === "CONNECTED").length;
  const activeSeries = documentSeries.filter((row) => row.active).length;
  const companyLabel = form.legalName.trim() || form.tradeName.trim() || form.commercialName.trim();

  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  function update(field: keyof FormState, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value } as FormState));
  }

  function updateDepartment(value: string) {
    setForm((current) => ({ ...current, department: value, province: "", district: "" }));
  }

  function updateProvince(value: string) {
    setForm((current) => ({ ...current, province: value, district: "" }));
  }

  function updateRow(field: "socialRows" | "legalLinkRows", index: number, key: "key" | "value", value: string) {
    setForm((current) => ({ ...current, [field]: current[field].map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row) }));
  }

  function addRow(field: "socialRows" | "legalLinkRows") {
    setForm((current) => ({ ...current, [field]: [...current[field], { key: "", value: "" }] }));
  }

  function removeRow(field: "socialRows" | "legalLinkRows", index: number) {
    setForm((current) => ({ ...current, [field]: current[field].filter((_, rowIndex) => rowIndex !== index) }));
  }

  async function uploadBrandingAsset(field: "logoMediaId" | "faviconMediaId", event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setUploading(field);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const result = await response.json() as { asset?: { id: string }; error?: string; errorObject?: { message?: string } };
      if (!response.ok || !result.asset?.id) throw new Error(result.errorObject?.message || result.error || "No se pudo subir el archivo.");
      update(field, result.asset.id);
      setMessage({ tone: "success", text: "Asset subido. Guarda la configuración para asociarlo al perfil empresarial." });
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "No se pudo subir el archivo." });
    } finally {
      setUploading(null);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rucInvalid) {
      setMessage({ tone: "error", text: "El RUC no es válido para Perú." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        version: form.version,
        legalName: form.legalName, tradeName: form.tradeName, commercialName: form.commercialName, ruc: form.ruc, country: form.country,
        department: form.department, province: form.province, district: form.district, address: form.address, phone: form.phone, phones: lines(form.phones), whatsapp: form.whatsapp,
        email: form.email, salesEmail: form.salesEmail, hours: form.hours, businessHours: form.businessHours, facebook: form.facebook, instagram: form.instagram, tiktok: form.tiktok, website: form.website,
        socials: Object.fromEntries(form.socialRows.filter((row) => row.key.trim() && row.value.trim()).map((row) => [row.key.trim(), row.value.trim()])),
        paymentMethods: lines(form.paymentMethods), guaranteeTerms: form.guaranteeTerms, coverage: form.coverage,
        legalLinks: Object.fromEntries(form.legalLinkRows.filter((row) => row.key.trim() && row.value.trim()).map((row) => [row.key.trim(), row.value.trim()])),
        logoMediaId: form.logoMediaId || null, faviconMediaId: form.faviconMediaId || null, primaryColor: form.primaryColor || null, secondaryColor: form.secondaryColor || null,
      };
      if (canPublishLegalPages) body.legalPagesPublished = form.legalPagesPublished;
      if (canManageTax) { body.taxRate = form.taxRate || null; body.taxMode = form.taxMode || null; }
      const response = await fetch("/api/admin/configuracion", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { settings?: CompanySettings; version?: number; error?: string; errorObject?: { message?: string } };
      if (!response.ok) throw new Error(result.errorObject?.message || result.error || "No se pudo guardar la configuración.");
      const next = toState(result.settings, result.version ?? form.version + 1);
      setForm(next);
      setInitialForm(next);
      setMessage({ tone: "success", text: "Configuración guardada y auditada." });
      router.refresh();
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "No se pudo guardar la configuración." });
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    setForm(initialForm);
    setMessage(null);
  }

  const tabs: Array<{ value: ConfigTab; label: string; icon: typeof Settings2 }> = [
    { value: "empresa", label: "Empresa", icon: Settings2 }, { value: "locales", label: "Locales", icon: MapPin }, { value: "series", label: "Series y documentos", icon: ReceiptText },
    { value: "precios", label: "Precios e IGV", icon: ReceiptText }, { value: "integraciones", label: "Integraciones", icon: PlugZap }, { value: "branding", label: "Branding", icon: Palette }, { value: "legal", label: "Legal", icon: Link2 }, { value: "historial", label: "Historial", icon: History },
  ];

  return <div className="space-y-4 pb-4 pt-5" data-a11y-surface="configuration">
    <style>{`[data-a11y-surface="configuration"] [class*="text-[#607894]"],[data-a11y-surface="configuration"] [class*="text-[#70869a]"],[data-a11y-surface="configuration"] [class*="text-[#71869c]"],[data-a11y-surface="configuration"] [class*="text-[#7890a8]"],[data-a11y-surface="configuration"] [class*="text-[#7b91a5]"],[data-a11y-surface="configuration"] [class*="text-[#8296a9]"],[data-a11y-surface="configuration"] [class*="text-[#8799a8]"],[data-a11y-surface="configuration"] [class*="text-[#9aabba]"]{color:#526b84;}[data-a11y-surface="configuration"] select{background-image:none !important;appearance:auto;}`}</style>
    <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563eb]">Gestión / Administración</p><h1 className="mt-2 text-[28px] font-black tracking-[-0.04em] text-[#102a43]">Configuración</h1><p className="mt-1 text-[13px] font-semibold text-[#607894]">Prepara la operación y factura con cambios versionados.</p></div><button type="button" className={secondaryButton} onClick={() => setTab("historial")}><Clock3 className="h-4 w-4" aria-hidden="true" /> Historial</button></header>
    <section className={`${card} grid items-start gap-0 overflow-hidden lg:grid-cols-[1.25fr_repeat(5,minmax(0,1fr))]`} aria-label="Completitud de configuración"><div className="border-b border-[#edf2f6] p-4 lg:border-b-0 lg:border-r"><p className="text-[15px] font-black text-[#102a43]">Completitud de configuración</p><p className="mt-1 text-[11px] font-semibold text-[#8296a9]">Lo que falta para operar sin bloqueos.</p></div><Metric label="Empresa" value={`${configuredCompanyFields}/6 campos`} progress={configuredCompanyFields / 6} /><Metric label="Locales" value={`${summary?.locations ?? 0} activos`} progress={locationsTotal ? (summary?.locations ?? 0) / locationsTotal : 0} /><Metric label="Series" value={`${activeSeries} activas`} progress={documentSeries.length ? activeSeries / documentSeries.length : 0} attention={!activeSeries} /><Metric label="IGV" value={form.taxMode && form.taxRate ? `${form.taxRate}% configurado` : "Sin configurar"} progress={form.taxMode && form.taxRate ? 1 : 0} attention={!form.taxMode || !form.taxRate} /><Metric label="Integraciones" value={`${connectedIntegrations}/${integrations.length} conectadas`} progress={integrations.length ? connectedIntegrations / integrations.length : 0} attention={connectedIntegrations < integrations.length} /></section>
    <nav className="flex gap-5 overflow-x-auto border-b border-[#dce6ee]" aria-label="Secciones de configuración" role="tablist">{tabs.map(({ value, label, icon: Icon }) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`shrink-0 border-b-2 px-1 py-3 text-[12px] font-extrabold ${tab === value ? "border-[#2563eb] text-[#2563eb]" : "border-transparent text-[#607894] hover:text-[#304b66]"}`}><Icon className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />{label}</button>)}</nav>
    {loading ? <div className={`${card} p-6 text-[13px] font-semibold text-[#71869c]`}>Cargando configuración empresarial…</div> : error ? <div className="rounded-xl border border-[#f3c4c4] bg-[#fff6f6] p-4 text-[13px] font-semibold text-[#b42318]" role="alert">{error}</div> : <form onSubmit={save}>
      {message ? <div className={`mb-3 rounded-lg border px-3 py-2.5 text-[13px] font-semibold ${message.tone === "success" ? "border-[#b8e8cf] bg-[#f0fbf5] text-[#087443]" : "border-[#f3c4c4] bg-[#fff6f6] text-[#b42318]"}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</div> : null}
      {tab === "empresa" ? <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_332px]"><section className={`${card} p-4 sm:p-5`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Datos de la empresa</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Estos datos aparecen en documentos, comprobantes y el pie de tienda.</p></div><span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-[11px] font-extrabold text-[#2563eb]">Empresa</span></div><div className="mt-5 grid gap-x-4 gap-y-1 sm:grid-cols-2"><TextField label="Razón social" value={form.legalName} onChange={(value) => update("legalName", value)} required help="Nombre legal registrado ante SUNAT." maxLength={200} /><TextField label="Nombre comercial" value={form.commercialName} onChange={(value) => update("commercialName", value)} help="Cómo reconocerán los clientes." maxLength={200} /><TextField label="RUC" value={form.ruc} onChange={(value) => update("ruc", value)} required help={rucInvalid ? "RUC inválido para Perú." : rucForPeru ? "RUC válido para Perú cuando cumple el dígito verificador." : "Se valida según el país seleccionado."} maxLength={40} /><TextField label="Correo de ventas" value={form.salesEmail} onChange={(value) => update("salesEmail", value)} required help="Recibe avisos de cotizaciones y pedidos." type="email" maxLength={240} /><TextField label="Teléfono" value={form.phone} onChange={(value) => update("phone", value)} help="Número visible en documentos." maxLength={40} /><TextField label="WhatsApp" value={form.whatsapp} onChange={(value) => update("whatsapp", value)} help="Canal rápido para clientes y proveedores." maxLength={40} /><TextField label="Dirección fiscal" value={form.address} onChange={(value) => update("address", value)} required help="Dirección de facturación registrada." maxLength={2000} /><TextField label="Sitio web" value={form.website} onChange={(value) => update("website", value)} help="Enlace visible en el pie de tienda." maxLength={500} /><TextField label="País" value={form.country} onChange={(value) => update("country", value)} help="Activa las reglas específicas del país." maxLength={120} /><TextField label="Horario de atención" value={form.businessHours || form.hours} onChange={(value) => update("businessHours", value)} help="Se muestra en contacto y documentos." maxLength={2000} /></div><div className="mt-4 grid gap-3 border-t border-[#edf2f6] pt-4 sm:grid-cols-3"><label className="grid gap-1.5 text-[12px] font-extrabold text-[#304b66]"><span>Departamento</span><select className={select} value={form.department} onChange={(event) => updateDepartment(event.currentTarget.value)}><option value="">Sin configurar</option>{PERU_DEPARTMENTS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="grid gap-1.5 text-[12px] font-extrabold text-[#304b66]"><span>Provincia</span><select className={select} value={form.province} onChange={(event) => updateProvince(event.currentTarget.value)} disabled={!provinces.length}><option value="">Sin configurar</option>{provinces.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="grid gap-1.5 text-[12px] font-extrabold text-[#304b66]"><span>Distrito</span><select className={select} value={form.district} onChange={(event) => update("district", event.currentTarget.value)} disabled={!districts.length}><option value="">Sin configurar</option>{districts.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div></section><aside className="grid items-start gap-3"><section className={`${card} p-4`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Vista previa</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Así aparecen los datos confirmados.</p></div><span className="rounded-md bg-[#f1f4f7] px-2 py-1 text-[11px] font-extrabold text-[#607894]">Actual</span></div><div className="mt-4 rounded-xl border border-[#dce6ee] bg-[#fbfcfd] p-4">{companyLabel || form.ruc || form.address || form.salesEmail ? <><div className="flex items-start justify-between gap-3 border-b border-[#e5edf3] pb-3"><div className="h-7 min-w-24 rounded-md bg-[#eaf2ff] px-2 py-1 text-[11px] font-black text-[#2563eb]">ColdPower</div><span className="text-[10px] font-semibold text-[#8296a9]">Documento comercial</span></div><p className="mt-4 text-[14px] font-black text-[#304b66]">{companyLabel || "Razón social pendiente"}</p><p className="mt-1 font-mono text-[10px] text-[#8296a9]">{form.ruc ? `RUC ${form.ruc}` : "RUC no registrado"}</p><p className="mt-1 text-[11px] font-semibold text-[#607894]">{form.address || "Dirección fiscal no registrada"}</p><p className="mt-3 border-t border-[#e5edf3] pt-3 text-[11px] font-semibold text-[#607894]">{form.salesEmail || "Correo de ventas no registrado"}</p></> : <EmptyState title="Sin datos empresariales configurados" detail="Completa los campos de Empresa para generar una vista previa fiel." />}</div></section><section className={`${card} p-4`}><h2 className="text-[16px] font-black text-[#102a43]">Último cambio</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Trazabilidad de la configuración.</p><div className="mt-4 flex items-start gap-3"><span className="mt-0.5 h-3 w-3 rounded-full border-2 border-[#cfe1fb] bg-[#2563eb]" aria-hidden="true" /><div><p className="text-[12px] font-extrabold text-[#304b66]">Versión {form.version || summary?.version || 0}</p><p className="mt-1 text-[11px] font-semibold text-[#8296a9]">{dateLabel(summary?.updatedAt)}</p></div></div></section></aside></div> : null}
      {tab === "locales" ? <section className={`${card} p-4 sm:p-5`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Locales operativos</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Registros reales usados por inventario, compras y entregas.</p></div><span className="rounded-md bg-[#e8f8ef] px-2 py-1 text-[11px] font-extrabold text-[#087443]">{summary?.locations ?? 0} activos</span></div>{locationRows.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead className="border-b border-[#dce6ee]"><tr>{["Código", "Local", "Tipo", "Ciudad", "Estado"].map((label) => <th key={label} className="px-2 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7890a8]">{label}</th>)}</tr></thead><tbody>{locationRows.map((row) => <tr key={row.id} className="border-b border-[#edf2f6] last:border-0"><td className="px-2 py-3 font-mono text-[12px] text-[#607894]">{row.code}</td><td className="px-2 py-3 text-[13px] font-extrabold text-[#304b66]">{row.name}</td><td className="px-2 py-3 text-[12px] text-[#607894]">{row.type}</td><td className="px-2 py-3 text-[12px] text-[#607894]">{row.city || "No registrada"}</td><td className="px-2 py-3"><span className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${row.active ? "bg-[#e8f8ef] text-[#087443]" : "bg-[#f1f4f7] text-[#607894]"}`}>{row.active ? "Activo" : "Inactivo"}</span></td></tr>)}</tbody></table>{locationRows.length < locationsTotal ? <p className="mt-3 text-[11px] font-semibold text-[#8296a9]">Se muestran {locationRows.length} de {locationsTotal} locales; el listado está limitado para esta vista.</p> : null}</div> : <div className="mt-4"><EmptyState title="No hay locales registrados" detail="La operación no tiene locales persistidos para mostrar." /></div>}</section> : null}
      {tab === "series" ? <section className={`${card} p-4 sm:p-5`}><div><h2 className="text-[16px] font-black text-[#102a43]">Series y documentos</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Secuencias persistidas para documentos comerciales y operativos.</p></div>{documentSeries.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="border-b border-[#dce6ee]"><tr>{["Código", "Etiqueta", "Documento", "Prefijo", "Siguiente", "Estado"].map((label) => <th key={label} className="px-2 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7890a8]">{label}</th>)}</tr></thead><tbody>{documentSeries.map((row) => <tr key={row.id} className="border-b border-[#edf2f6] last:border-0"><td className="px-2 py-3 font-mono text-[12px] text-[#607894]">{row.code}</td><td className="px-2 py-3 text-[13px] font-extrabold text-[#304b66]">{row.label}</td><td className="px-2 py-3 text-[12px] text-[#607894]">{row.documentType}</td><td className="px-2 py-3 font-mono text-[12px] text-[#607894]">{row.prefix}</td><td className="px-2 py-3 font-mono text-[12px] text-[#304b66]">{row.nextNumber}</td><td className="px-2 py-3"><span className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${row.active ? "bg-[#e8f8ef] text-[#087443]" : "bg-[#f1f4f7] text-[#607894]"}`}>{row.active ? "Activa" : "Inactiva"}</span></td></tr>)}</tbody></table></div> : <div className="mt-4"><EmptyState title="No hay series configuradas" detail="No se muestran secuencias ficticias: crea una serie desde el flujo de documentos autorizado." /></div>}</section> : null}
      {tab === "precios" ? <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_332px]"><section className={`${card} p-4 sm:p-5`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Listas activas</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Tipos de precio con registros activos en el catálogo.</p></div><span className="rounded-md bg-[#eaf2ff] px-2 py-1 text-[11px] font-extrabold text-[#2563eb]">{priceLists.length} tipos</span></div>{priceLists.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{priceLists.map((row) => <div key={row.priceType} className="rounded-lg border border-[#edf2f6] bg-[#fbfcfd] p-3"><div className="flex items-center justify-between gap-3"><p className="text-[13px] font-extrabold text-[#304b66]">{row.label}</p><span className="font-mono text-[12px] font-black text-[#2563eb]">{row.activePrices}</span></div><p className="mt-1 text-[11px] font-semibold text-[#8296a9]">precios activos persistidos</p></div>)}</div> : <div className="mt-4"><EmptyState title="No hay listas activas" detail="No se han encontrado precios activos para mostrar." /></div>}</section><section className={`${card} p-4 sm:p-5`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">IGV</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Se aplica según la configuración versionada.</p></div>{canManageTax ? <span className="rounded-md bg-[#f0ebff] px-2 py-1 text-[11px] font-extrabold text-[#7856d8]">SUPERADMIN</span> : null}</div>{canManageTax ? <div className="mt-4 grid gap-3"><TextField label="Tasa de IGV" value={form.taxRate} onChange={(value) => update("taxRate", value)} help="Entre 0 y 100, con hasta dos decimales." type="number" /><label className="grid gap-1.5 text-[12px] font-extrabold text-[#304b66]"><span>Modalidad</span><select className={select} value={form.taxMode} onChange={(event) => update("taxMode", event.currentTarget.value)}><option value="">Sin configurar</option><option value="INCLUDED">Precios con IGV incluido</option><option value="EXCLUDED">Precios sin IGV</option></select></label></div> : <EmptyState title="Configuración restringida" detail="Solo SUPERADMIN puede modificar el IGV. El estado actual se muestra en el indicador superior." />}</section></div> : null}
      {tab === "integraciones" ? <section className={`${card} p-4 sm:p-5`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Integraciones</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Pruebas contra servicios reales; no se presentan conexiones como operativas sin evidencia.</p></div>{canManageIntegrations ? <TestIntegrationsButton /> : null}</div><div className="mt-4 grid gap-2">{integrations.map((row) => <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#edf2f6] p-3"><div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eaf2ff] text-[#2563eb]"><PlugZap className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><p className="text-[13px] font-extrabold text-[#304b66]">{row.label}</p><p className="mt-1 text-[11px] font-semibold text-[#8296a9]">{row.description}</p><p className="mt-1 text-[11px] font-semibold text-[#607894]">{row.lastCheckedMessage || "Aún no se ha ejecutado una prueba."}</p></div></div><div className="flex items-center gap-2"><span className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${row.lastCheckedStatus === "CONNECTED" ? "bg-[#e8f8ef] text-[#087443]" : "bg-[#fff3df] text-[#9a5c16]"}`}>{statusLabel(row.lastCheckedStatus)}</span>{canManageIntegrations ? <TestIntegrationsButton integrationKey={row.key} compact /> : null}</div></div>)}{!integrations.length ? <EmptyState title="No hay integraciones catalogadas" detail="No se muestran servicios ficticios; registra una integración autorizada para verla aquí." /> : null}</div></section> : null}
      {tab === "branding" ? <section className={`${card} p-4 sm:p-5`}><div><h2 className="text-[16px] font-black text-[#102a43]">Branding</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Assets y colores persistidos para documentos y storefront.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><BrandingUpload label="Logo comercial" field="logoMediaId" value={form.logoMediaId} uploading={uploading === "logoMediaId"} onChange={(event) => void uploadBrandingAsset("logoMediaId", event)} /><BrandingUpload label="Favicon" field="faviconMediaId" value={form.faviconMediaId} uploading={uploading === "faviconMediaId"} onChange={(event) => void uploadBrandingAsset("faviconMediaId", event)} /><TextField label="Color primario" value={form.primaryColor} onChange={(value) => update("primaryColor", value)} help="Hexadecimal #RRGGBB; vacío conserva el estado sin configurar." /><TextField label="Color secundario" value={form.secondaryColor} onChange={(value) => update("secondaryColor", value)} help="Hexadecimal #RRGGBB; vacío conserva el estado sin configurar." /></div></section> : null}
      {tab === "legal" ? <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_332px]"><section className={`${card} p-4 sm:p-5`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-black text-[#102a43]">Enlaces legales</h2><p className="mt-1 text-[12px] font-semibold text-[#7b91a5]">Solo se guardan enlaces HTTP/HTTPS confirmados.</p></div><button type="button" className={secondaryButton} onClick={() => addRow("legalLinkRows")}><Plus className="h-4 w-4" aria-hidden="true" /> Agregar</button></div><div className="mt-4 grid gap-2">{form.legalLinkRows.map((row, index) => <div key={`legal-${index}`} className="grid gap-2 sm:grid-cols-[0.7fr_1.3fr_auto]"><input aria-label={`Etiqueta legal ${index + 1}`} value={row.key} onChange={(event) => updateRow("legalLinkRows", index, "key", event.currentTarget.value)} className={input} placeholder="Etiqueta" /><input aria-label={`URL legal ${index + 1}`} value={row.value} onChange={(event) => updateRow("legalLinkRows", index, "value", event.currentTarget.value)} className={input} placeholder="https://…" /><button type="button" aria-label={`Eliminar enlace legal ${index + 1}`} className="inline-flex h-10 items-center justify-center rounded-lg border border-[#ffd0d0] px-3 text-[11px] font-extrabold text-[#d94848]" onClick={() => removeRow("legalLinkRows", index)}><X className="h-4 w-4" aria-hidden="true" /></button></div>)}{!form.legalLinkRows.length ? <EmptyState title="No hay enlaces legales" detail="No se inventan rutas; agrega únicamente enlaces aprobados por la empresa." /> : null}</div></section><section className={`${card} p-4 sm:p-5`}>{canPublishLegalPages ? <><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 text-[#b45309]" aria-hidden="true" /><div><h2 className="text-[16px] font-black text-[#102a43]">Publicación legal</h2><p className="mt-1 text-[12px] leading-5 text-[#7b91a5]">Activa las páginas después de completar y validar los enlaces.</p></div></div><label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-[#f4d39a] bg-[#fffaf0] p-3"><input type="checkbox" checked={form.legalPagesPublished} onChange={(event) => update("legalPagesPublished", event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#2563eb]" /><span><span className="block text-[12px] font-extrabold text-[#304b66]">Publicar páginas legales</span><span className="mt-1 block text-[11px] leading-5 text-[#7b91a5]">El cambio queda registrado en auditoría.</span></span></label></> : <EmptyState title="Publicación restringida" detail="Solo el permiso de publicación legal puede cambiar este estado." />}</section></div> : null}
      {tab === "historial" ? <CompanySettingsHistoryPanel currentVersion={form.version || summary?.version || 0} /> : null}
      {isDirty ? <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce6ee] bg-white/95 p-3 shadow-[0_-8px_22px_rgba(16,42,67,0.08)] backdrop-blur"><div className="flex items-center gap-2 text-[12px] font-extrabold text-[#9a5c16]"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> Cambios sin guardar · se creará una nueva versión</div><div className="flex gap-2"><button type="button" className={secondaryButton} onClick={discard} disabled={busy}>Descartar</button><button type="submit" className={primaryButton} disabled={busy || rucInvalid}><Save className="h-4 w-4" aria-hidden="true" />{busy ? "Guardando…" : "Guardar cambios"}</button></div></div> : null}
    </form>}
  </div>;
}

function Metric({ label, value, progress, attention = false }: { label: string; value: string; progress: number; attention?: boolean }) {
  return <div className="border-b border-[#edf2f6] p-4 last:border-0 lg:border-b-0 lg:border-r lg:last:border-r-0"><p className="text-[11px] font-semibold text-[#8296a9]">{label}</p><p className={`mt-1 text-[13px] font-black ${attention ? "text-[#b45309]" : "text-[#304b66]"}`}>{value}{attention ? <AlertTriangle className="ml-1 inline h-3 w-3" aria-label="Revisión requerida" /> : null}</p><div className="mt-3 h-1 rounded-full bg-[#e8eef3]"><span className={`block h-1 rounded-full ${attention ? "bg-[#f59e0b]" : "bg-[#2563eb]"}`} style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} /></div></div>;
}

function BrandingUpload({ label, field, value, uploading, onChange }: { label: string; field: string; value: string; uploading: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="grid cursor-pointer gap-2 rounded-xl border border-dashed border-[#b9d3f4] bg-[#f5f9ff] p-4 text-[12px] font-extrabold text-[#526b84] transition hover:border-[#2277ee] hover:bg-[#eef5ff]"><span className="flex items-center gap-2 text-[#2277ee]"><Upload className="h-4 w-4" aria-hidden="true" />{label}</span><span className="text-[11px] font-semibold text-[#607894]">{value ? `Asset asociado: ${value}` : "No hay asset asociado."}</span><span className="inline-flex h-8 w-fit items-center gap-2 rounded-md bg-white px-3 text-[11px] font-extrabold text-[#2277ee]">{uploading ? "Subiendo…" : "Seleccionar archivo"}</span><input name={field} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={uploading} onChange={onChange} /></label>;
}
