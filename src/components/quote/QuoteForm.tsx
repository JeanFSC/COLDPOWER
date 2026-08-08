"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { products } from "@/data/products";
import { company } from "@/data/company";
import { Button } from "@/components/shared/Button";
import { QuoteSuccess } from "@/components/quote/QuoteSuccess";
import { createWhatsAppLink } from "@/lib/whatsapp";
import {
  buildQuotePayload,
  buildQuoteWhatsAppMessage,
  validateQuotePayload,
  type QuoteField,
  type QuotePayload,
} from "@/lib/quote";

type QuoteFormProps = {
  initialProductSlug?: string;
};

type ApiSuccess = {
  success: true;
  message: string;
  quoteId: string;
  receivedAt: string;
};

type ApiFailure = {
  success: false;
  message: string;
  errors?: Partial<Record<QuoteField, string>>;
};

const fieldIds: Record<QuoteField, string> = {
  name: "quote-name",
  phone: "quote-phone",
  email: "quote-email",
  message: "quote-message",
};

export function QuoteForm({ initialProductSlug }: QuoteFormProps) {
  const initialProduct = products.find((product) => product.slug === initialProductSlug);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: initialProduct
      ? `Hola ColdPower, deseo cotizar ${initialProduct.name} (${initialProduct.sku}).`
      : "Hola ColdPower, deseo cotizar un equipo o repuesto de refrigeración.",
  });
  const [productSlug, setProductSlug] = useState(initialProduct?.slug ?? "");
  const [errors, setErrors] = useState<Partial<Record<QuoteField, string>>>({});
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<(ApiSuccess & { payload: QuotePayload }) | null>(null);

  const selectedProduct = products.find((product) => product.slug === productSlug);
  const payload = buildQuotePayload(form, selectedProduct);

  const whatsappHref = useMemo(
    () =>
      createWhatsAppLink({
        phone: company.whatsapp,
        message: buildQuoteWhatsAppMessage(payload, success?.quoteId),
      }),
    [payload, success?.quoteId],
  );

  if (success) {
    return (
      <QuoteSuccess
        quoteId={success.quoteId}
        receivedAt={success.receivedAt}
        payload={success.payload}
        whatsappHref={whatsappHref}
      />
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("");

    const validation = validateQuotePayload(payload);
    if (!validation.ok) {
      setErrors(validation.errors);
      setFormMessage("Corrige los campos marcados antes de registrar la solicitud.");
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/cotizacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      });
      const result = (await response.json()) as ApiSuccess | ApiFailure;

      if (!result.success) {
        setErrors(result.errors ?? {});
        setFormMessage(result.message || "No se pudo registrar la solicitud.");
        return;
      }

      if (!response.ok) {
        setFormMessage("No se pudo registrar la solicitud.");
        return;
      }

      setSuccess({ ...result, payload: validation.data });
    } catch {
      setFormMessage(
        "No se pudo conectar con el registro temporal. Intenta continuar por WhatsApp.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return (
    <form
      className="w-full min-w-0 max-w-full rounded-lg border border-border bg-white p-5 shadow-card sm:p-6"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldErrorLabel label="Nombre" field="name" errors={errors}>
          <input
            id={fieldIds.name}
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className={inputClass(errors.name)}
            placeholder="Tu nombre"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${fieldIds.name}-error` : undefined}
            aria-required="true"
          />
        </FieldErrorLabel>

        <FieldErrorLabel label="Teléfono" field="phone" errors={errors}>
          <input
            id={fieldIds.phone}
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className={inputClass(errors.phone)}
            placeholder={company.primaryPhone}
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
          placeholder={company.commercialEmail}
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${fieldIds.email}-error` : undefined}
        />
      </FieldErrorLabel>

      <label className="mt-4 grid gap-2 text-sm font-extrabold text-dark" htmlFor="quote-product">
        Producto de interés
        <select
          id="quote-product"
          value={productSlug}
          onChange={(event) => setProductSlug(event.target.value)}
          className="h-11 w-full min-w-0 max-w-full rounded-md border border-border bg-background px-3 text-sm font-medium outline-primary"
        >
          <option value="">Cotizar sin producto específico</option>
          {products.map((product) => (
            <option key={product.id} value={product.slug}>
              {product.name} · {product.sku}
            </option>
          ))}
        </select>
      </label>

      <FieldErrorLabel label="Mensaje" field="message" errors={errors} className="mt-4">
        <textarea
          id={fieldIds.message}
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          rows={5}
          className={inputClass(errors.message, "min-h-32 py-3")}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? `${fieldIds.message}-error` : "quote-message-help"}
          aria-required="true"
        />
        <span id="quote-message-help" className="text-xs font-semibold text-gray-text">
          Incluye marca, modelo, capacidad o foto disponible del repuesto si aplica.
        </span>
      </FieldErrorLabel>

      {formMessage ? (
        <p className="mt-4 rounded-md border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          {formMessage}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
          <Send className="h-5 w-5" aria-hidden="true" />
          {isSubmitting ? "Registrando..." : "Registrar solicitud"}
        </Button>
        <Button
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          variant="whatsapp"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Continuar por WhatsApp
        </Button>
      </div>

      <div className="mt-5 rounded-md border border-teal/25 bg-teal/10 p-4 text-sm leading-6 text-dark">
        <p className="font-extrabold">Canal operativo temporal</p>
        <p className="mt-1 text-gray-text">
          El formulario registra la solicitud en una API temporal. WhatsApp sigue siendo el canal
          operativo para confirmar disponibilidad y precio final.
        </p>
      </div>
    </form>
  );
}

function FieldErrorLabel({
  label,
  field,
  errors,
  className = "",
  children,
}: {
  label: string;
  field: QuoteField;
  errors: Partial<Record<QuoteField, string>>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`grid gap-2 text-sm font-extrabold text-dark ${className}`}
      htmlFor={fieldIds[field]}
    >
      {label}
      {children}
      {errors[field] ? (
        <span
          id={`${fieldIds[field]}-error`}
          className="text-xs font-bold text-danger"
          role="alert"
        >
          {errors[field]}
        </span>
      ) : null}
    </label>
  );
}

function inputClass(error?: string, extra = "") {
  return [
    "w-full min-w-0 rounded-md border bg-background px-3 text-sm font-medium outline-primary",
    extra || "h-11",
    error ? "border-danger" : "border-border",
  ]
    .filter(Boolean)
    .join(" ");
}
