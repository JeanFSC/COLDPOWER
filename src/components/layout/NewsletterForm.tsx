"use client";

import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { FormEvent, useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      setStatus(response.ok ? "success" : "error");
      if (response.ok) setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <p className="home-newsletter-success"><CheckCircle2 aria-hidden="true" />Correo registrado. Gracias por acompañarnos.</p>;
  }

  return (
    <form onSubmit={submit} className="home-newsletter-form">
      <label htmlFor="newsletter-email">Recibe novedades y ofertas</label>
      <div className="home-newsletter-input-wrap">
        <input id="newsletter-email" name="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setStatus("idle"); }} placeholder="Tu correo electrónico" required />
        <button type="submit" aria-label="Suscribirme" disabled={status === "loading"}>
          {status === "loading" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </button>
      </div>
      <p>Sin spam. Solo información relevante.</p>
      {status === "error" ? <span role="alert">No pudimos registrar el correo. Inténtalo nuevamente.</span> : null}
    </form>
  );
}
