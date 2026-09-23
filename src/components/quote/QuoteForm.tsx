"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { MessageCircle, Search, Send, X } from "lucide-react";
import type { CompanySettings } from "@/lib/company-settings";
import { Button } from "@/components/shared/Button";
import { QuoteSuccess } from "@/components/quote/QuoteSuccess";
import { useCart } from "@/components/cart/CartProvider";
import { WhatsAppLeadButton } from "@/components/shared/WhatsAppLeadButton";
import { trackCatalogEvent } from "@/lib/analytics";
import {
  buildQuotePayload,

  validateQuotePayload,
  type QuoteField,
  type QuotePayload,
} from "@/lib/quote";

export type QuoteSearchProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  sku: string;
  category: string;
  status: "in-stock" | "low-stock" | "on-request" | "out-of-stock";
};

type QuoteFormProps = { initialProduct?: QuoteSearchProduct; companySettings?: CompanySettings };
type ApiSuccess = { success: true; message: string; quoteId: string; receivedAt: string };
type ApiFailure = { success: false; message: string; errors?: Partial<Record<QuoteField, string>> };
type SearchResponse = { success: true; products: QuoteSearchProduct[] };
type QuoteFormState = Pick<
  QuotePayload,
  | "name"
  | "customerType"
  | "documentNumber"
  | "phone"
  | "email"
  | "department"
  | "province"
  | "district"
  | "preferredContact"
  | "consent"
  | "message"
>;

const fieldIds: Record<QuoteField, string> = {
  name: "quote-name",
  customerType: "quote-customer-type",
  documentNumber: "quote-document",
  phone: "quote-phone",
  email: "quote-email",
  department: "quote-department",
  province: "quote-province",
  district: "quote-district",
  preferredContact: "preferred-contact",
  consent: "quote-consent",
  message: "quote-message",
};

export function QuoteForm({ initialProduct, companySettings }: QuoteFormProps) {
  const defaultMessage = initialProduct
    ? `Hola ColdPower, deseo cotizar ${initialProduct.name} (${initialProduct.sku}).`
    : "Hola ColdPower, deseo cotizar un equipo o repuesto de refrigeracion.";
  const [form, setForm] = useState<QuoteFormState>({
    name: "",
    customerType: "natural",
    documentNumber: "",
    phone: "",
    email: "",
    department: "",
    province: "",
    district: "",
    preferredContact: "whatsapp",
    consent: false,
    message: defaultMessage,
  });
  const [query, setQuery] = useState(initialProduct?.name ?? "");
  const [selectedProduct, setSelectedProduct] = useState<QuoteSearchProduct | undefined>(initialProduct);
  const [suggestions, setSuggestions] = useState<QuoteSearchProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchRetry, setSearchRetry] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<QuoteField, string>>>({});
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<(ApiSuccess & { payload: QuotePayload }) | null>(null);
  const { clearCart: clearQuoteList } = useCart();

  useEffect(() => {
    trackCatalogEvent("quote_started", { productSlug: initialProduct?.slug });
  }, [initialProduct?.slug]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || selectedProduct?.name === trimmedQuery) {
      const resetTimer = window.setTimeout(() => {
        setSuggestions([]);
        setIsSearching(false);
        setSearchError("");
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsSearching(true);
      setSearchError("");
      void fetch(`/api/catalog/search?q=${encodeURIComponent(trimmedQuery)}&limit=8`, {
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) throw new Error("catalog search unavailable");
          return response.json() as Promise<SearchResponse>;
        })
        .then((result) => {
          if (!cancelled) {
            setSuggestions(result.products ?? []);
            setSearchError("");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setNotFound(false);
            setSearchError("No pudimos consultar el catalogo. Reintenta la busqueda.");
          }
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, searchRetry, selectedProduct?.name]);

  const payload = buildQuotePayload(form, selectedProduct);
  if (success) {
    return (
      <QuoteSuccess
        quoteId={success.quoteId}
        receivedAt={success.receivedAt}
        payload={success.payload}
      />
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");
    const validation = validateQuotePayload(payload);
    if (!validation.ok) {
      setErrors(validation.errors);
      setFormMessage("Corrige los campos marcados antes de enviar la solicitud.");
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/cotizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const result = (await response.json()) as ApiSuccess | ApiFailure;
      if (!result.success) {
        setErrors(result.errors ?? {});
        setFormMessage(result.message || "No se pudo enviar la solicitud.");
        return;
      }
      if (!response.ok) {
        setFormMessage("No se pudo enviar la solicitud.");
        return;
      }
      setSuccess({ ...result, payload: validation.data });
      // The server already emptied the quote list inside the quote transaction; clear the
      // local copy too so it isn't synced back.
      clearQuoteList();
      trackCatalogEvent("quote_submitted", {
        quoteId: result.quoteId,
        productSlug: validation.data.productSlug,
      });
    } catch {
      setFormMessage("No se pudo enviar la solicitud. Intenta continuar por WhatsApp.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField<K extends keyof QuoteFormState>(field: K, value: QuoteFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateProductQuery(value: string) {
    setQuery(value);
    setNotFound(false);
    setSearchError("");
    if (selectedProduct && value !== selectedProduct.name) setSelectedProduct(undefined);
  }

  function selectProduct(product: QuoteSearchProduct) {
    setSelectedProduct(product);
    setQuery(product.name);
    setSuggestions([]);
    setNotFound(false);
    setForm((current) => ({
      ...current,
      message:
        current.message === defaultMessage ||
        current.message.startsWith("Hola ColdPower, deseo cotizar un equipo")
          ? `Hola ColdPower, deseo cotizar ${product.name} (${product.sku}).`
          : current.message,
    }));
  }

  function chooseNotFound() {
    setSelectedProduct(undefined);
    setSuggestions([]);
    setNotFound(true);
    setQuery("");
    setForm((current) => ({
      ...current,
      message: "No encontre mi producto. Necesito ayuda para identificarlo y confirmar compatibilidad.",
    }));
    trackCatalogEvent("product_not_found_sent", { context: "quote_form" });
  }

  const documentLabel = form.customerType === "company" ? "RUC" : "DNI";
  const documentPlaceholder = form.customerType === "company" ? "11 digitos" : "8 digitos";

  return (
    <form
      className="w-full min-w-0 max-w-full rounded-lg border border-border bg-white p-5 shadow-card sm:p-6"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldErrorLabel label="Nombre o razon social" field="name" errors={errors}>
          <input
            id={fieldIds.name}
            required
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className={inputClass(errors.name)}
            placeholder="Tu nombre o empresa"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${fieldIds.name}-error` : undefined}
            aria-required="true"
          />
        </FieldErrorLabel>
        <FieldErrorLabel label="Tipo de cliente" field="customerType" errors={errors}>
          <select
            id={fieldIds.customerType}
            required
            value={form.customerType}
            onChange={(event) => {
              updateField("customerType", event.target.value as QuoteFormState["customerType"]);
              updateField("documentNumber", "");
            }}
            className={inputClass(errors.customerType, "h-11")}
            aria-invalid={Boolean(errors.customerType)}
            aria-describedby={errors.customerType ? `${fieldIds.customerType}-error` : undefined}
          >
            <option value="natural">Persona natural</option>
            <option value="company">Empresa</option>
          </select>
        </FieldErrorLabel>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FieldErrorLabel label={documentLabel} field="documentNumber" errors={errors}>
          <input
            id={fieldIds.documentNumber}
            required
            value={form.documentNumber}
            onChange={(event) => updateField("documentNumber", event.target.value)}
            className={inputClass(errors.documentNumber)}
            placeholder={documentPlaceholder}
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={Boolean(errors.documentNumber)}
            aria-describedby={errors.documentNumber ? `${fieldIds.documentNumber}-error` : undefined}
          />
        </FieldErrorLabel>
        <FieldErrorLabel label="Telefono" field="phone" errors={errors}>
          <input
            id={fieldIds.phone}
            required
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className={inputClass(errors.phone)}
            placeholder={companySettings?.phones?.[0] ?? ""}
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? `${fieldIds.phone}-error` : undefined}
            aria-required="true"
          />
        </FieldErrorLabel>
      </div>

      <FieldErrorLabel label="Correo opcional" field="email" errors={errors} className="mt-4">
        <input
          id={fieldIds.email}
          type="email"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          className={inputClass(errors.email)}
          placeholder={companySettings?.email ?? ""}
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${fieldIds.email}-error` : undefined}
        />
      </FieldErrorLabel>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <FieldErrorLabel label="Departamento" field="department" errors={errors}>
          <input id={fieldIds.department} required value={form.department} onChange={(event) => updateField("department", event.target.value)} className={inputClass(errors.department)} placeholder="Ej. Lima" autoComplete="address-level1" aria-invalid={Boolean(errors.department)} />
        </FieldErrorLabel>
        <FieldErrorLabel label="Provincia" field="province" errors={errors}>
          <input id={fieldIds.province} required value={form.province} onChange={(event) => updateField("province", event.target.value)} className={inputClass(errors.province)} placeholder="Ej. Lima" autoComplete="address-level2" aria-invalid={Boolean(errors.province)} />
        </FieldErrorLabel>
        <FieldErrorLabel label="Distrito" field="district" errors={errors}>
          <input id={fieldIds.district} required value={form.district} onChange={(event) => updateField("district", event.target.value)} className={inputClass(errors.district)} placeholder="Ej. Miraflores" autoComplete="address-level3" aria-invalid={Boolean(errors.district)} />
        </FieldErrorLabel>
      </div>

      <FieldErrorLabel label="Medio de contacto preferido" field="preferredContact" errors={errors} className="mt-4">
        <select id={fieldIds.preferredContact} required value={form.preferredContact} onChange={(event) => updateField("preferredContact", event.target.value as QuoteFormState["preferredContact"])} className={inputClass(errors.preferredContact, "h-11")} aria-invalid={Boolean(errors.preferredContact)} aria-describedby={errors.preferredContact ? `${fieldIds.preferredContact}-error` : undefined}>
          <option value="whatsapp">WhatsApp</option>
          <option value="phone">Llamada telefonica</option>
          <option value="email">Correo electronico</option>
        </select>
      </FieldErrorLabel>

      <div className="relative mt-4">
        <label className="grid gap-2 text-sm font-extrabold text-dark" htmlFor="quote-product-search">
          Producto de interes
          <div className="flex h-11 items-center gap-2 rounded-md border border-border bg-background px-3 outline-primary focus-within:border-primary">
            <Search className="h-4 w-4 shrink-0 text-gray-text" aria-hidden="true" />
            <input id="quote-product-search" value={query} onChange={(event) => updateProductQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" placeholder="Busca SKU, MPN, marca, modelo o nombre" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls="quote-product-suggestions" />
            {query ? <button type="button" className="text-gray-text hover:text-danger" aria-label="Limpiar producto" onClick={() => updateProductQuery("")}><X className="h-4 w-4" aria-hidden="true" /></button> : null}
          </div>
        </label>
        {suggestions.length > 0 ? (
          <ul id="quote-product-suggestions" role="listbox" className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-md border border-border bg-white p-1 shadow-float">
            {suggestions.map((product) => (
              <li key={product.id} role="option" aria-selected={selectedProduct?.id === product.id}>
                <button type="button" className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-background" onClick={() => selectProduct(product)}>
                  <span className="text-sm font-extrabold text-dark">{product.name}</span>
                  <span className="mt-1 font-mono text-[11px] font-bold text-gray-text">{product.brand} · {product.sku}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {searchError ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-danger/25 bg-danger/5 px-3 py-2 text-xs font-semibold text-danger" role="alert" aria-live="assertive">
            <span>{searchError}</span>
            <button type="button" className="font-extrabold underline underline-offset-2" onClick={() => setSearchRetry((current) => current + 1)}>Reintentar</button>
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-gray-text">
          <span>{isSearching ? "Buscando referencias..." : selectedProduct ? `Seleccionado: ${selectedProduct.sku}` : notFound ? "Se enviara como consulta general" : "Escribe al menos 2 caracteres"}</span>
          <button type="button" className="font-extrabold text-primary hover:underline" onClick={chooseNotFound}>No encontre mi producto</button>
        </div>
      </div>

      <FieldErrorLabel label="Mensaje" field="message" errors={errors} className="mt-4">
        <textarea id={fieldIds.message} required value={form.message} onChange={(event) => updateField("message", event.target.value)} rows={5} className={inputClass(errors.message, "min-h-32 py-3")} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? `${fieldIds.message}-error` : "quote-message-help"} aria-required="true" />
        <span id="quote-message-help" className="text-xs font-semibold text-gray-text">Incluye marca, modelo, capacidad o foto disponible del repuesto si aplica.</span>
      </FieldErrorLabel>

      <div className="mt-4 rounded-md border border-border bg-background p-3">
        <label htmlFor={fieldIds.consent} className="flex items-start gap-3 text-sm font-semibold text-dark">
          <input id={fieldIds.consent} required type="checkbox" checked={form.consent} onChange={(event) => updateField("consent", event.target.checked)} className="mt-1 h-4 w-4 accent-primary" aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? `${fieldIds.consent}-error` : undefined} />
          <span>Acepto que ColdPower use estos datos para responder mi solicitud de cotizacion.</span>
        </label>
        {errors.consent ? <p id={`${fieldIds.consent}-error`} className="mt-2 text-xs font-bold text-danger" role="alert">{errors.consent}</p> : null}
      </div>

      {formMessage ? <p className="mt-4 rounded-md border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger" role="alert" aria-live="assertive">{formMessage}</p> : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}><Send className="h-5 w-5" aria-hidden="true" />{isSubmitting ? "Enviando solicitud..." : "Solicitar cotización"}</Button>
        <WhatsAppLeadButton title="Consulta desde formulario de cotizacion" initialName={form.name} initialPhone={form.phone} initialEmail={form.email} productIds={selectedProduct ? [selectedProduct.id] : []} items={selectedProduct ? [{ name: selectedProduct.name, sku: selectedProduct.sku, quantity: 1 }] : []} className="w-full sm:w-auto" disabled={isSubmitting}><MessageCircle className="h-5 w-5" aria-hidden="true" />Continuar por WhatsApp</WhatsAppLeadButton>
      </div>
      <div className="mt-5 rounded-md border border-teal/25 bg-teal/10 p-4 text-sm leading-6 text-dark">
        <p className="font-extrabold">Seguimiento de tu solicitud</p>
        <p className="mt-1 text-gray-text">Tu solicitud quedara registrada para que nuestro equipo pueda darle seguimiento y confirmar disponibilidad y precio final.</p>
      </div>
    </form>
  );
}

function FieldErrorLabel({ label, field, errors, className = "", children }: { label: string; field: QuoteField; errors: Partial<Record<QuoteField, string>>; className?: string; children: ReactNode }) {
  return <label className={`grid gap-2 text-sm font-extrabold text-dark ${className}`} htmlFor={fieldIds[field]}>{label}{children}{errors[field] ? <span id={`${fieldIds[field]}-error`} className="text-xs font-bold text-danger" role="alert">{errors[field]}</span> : null}</label>;
}

function inputClass(error?: string, extra = "") {
  return ["w-full min-w-0 rounded-md border bg-background px-3 text-sm font-medium outline-primary", extra || "h-11", error ? "border-danger" : "border-border"].filter(Boolean).join(" ");
}
