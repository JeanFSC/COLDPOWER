"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  FileText,
  Headphones,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  Paperclip,
  Phone,
  Send,
  ShieldCheck,
  Truck,
  Upload,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CatalogBrand } from "@/lib/catalog-repository";
import type { CompanySettings } from "@/lib/company-settings";
import { createWhatsAppLink } from "@/lib/whatsapp";
import { validatePublicContactPayload } from "@/lib/public-contact-validation";
import styles from "./ContactPage.module.css";

export type ContactPageAssets = { hero: string; coverage: string; cta: string };

type ContactPageProps = {
  settings: CompanySettings;
  brands: CatalogBrand[];
  assets: ContactPageAssets;
  initialMessage?: string;
};

type ContactFormValues = { name: string; company: string; phone: string; email: string; message: string; consent: boolean };
type FormStatus = "idle" | "submitting" | "success" | "error";

const initialForm: ContactFormValues = { name: "", company: "", phone: "", email: "", message: "", consent: false };
const allowedExtensions = ["jpg", "jpeg", "png", "webp", "pdf"];

export function ContactPage({ settings, brands, assets, initialMessage }: ContactPageProps) {
  const phone = settings.phones?.[0] ?? settings.phone ?? "";
  const email = settings.salesEmail ?? settings.email ?? "";
  const hours = settings.businessHours ?? settings.hours ?? "";
  const hasCoverage = Boolean(settings.coverage?.trim());
  const coverageHeading = settings.coverage?.trim() || "Cobertura coordinada";
  const coverageCopy = hasCoverage
    ? "Brindamos atención comercial y coordinamos despachos según tu ubicación y disponibilidad."
    : "Un asesor confirmará cobertura y opciones de despacho para tu proyecto.";

  return (
    <section className={styles.page} data-contact-page="true">
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroMain}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>Contacto comercial ColdPower</p>
                <h1 className={styles.heroTitle}>
                  Hablemos de tu
                  <br />
                  requerimiento
                </h1>
                <p className={styles.heroSubtitle}>Cotiza con asesoría técnica y comercial para tus proyectos de refrigeración y HVAC.</p>
                <p className={styles.heroBody}>Envíanos el modelo, SKU, foto o una descripción del repuesto o equipo que necesitas. Nuestro equipo te ayudará a encontrar la mejor opción y te enviará una cotización a la brevedad.</p>
                <div className={styles.heroActions}>
                  <a href="#contact-form" className={styles.primaryButton}>
                    <Send aria-hidden="true" />
                    Enviar consulta
                  </a>
                  <Link href="/cotizacion" className={styles.secondaryButton}>
                    Ir a cotización <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div className={styles.heroArt}>
                <Image src={assets.hero} alt="Equipos y repuestos de refrigeración comercial ColdPower." fill priority sizes="(min-width: 1280px) 44vw, (min-width: 768px) 52vw, 100vw" className={styles.heroImage} />
                <div className={styles.handwritten} aria-hidden="true">
                  Tu proyecto,
                  <br />
                  nuestro respaldo
                  <span />
                </div>
              </div>
              <div className={styles.benefits}>
                <Benefit icon={Wrench} title="Asesoría especializada" body="Soporte técnico y comercial" />
                <Benefit icon={ShieldCheck} title="Respuesta rápida" body="Te contactamos a la brevedad" />
                <Benefit icon={Truck} title="Soluciones para tu negocio" body="Repuestos y equipos para múltiples aplicaciones" />
              </div>
            </div>
            <ContactChannels phone={phone} whatsapp={settings.whatsapp ?? ""} email={email} hours={hours} />
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={`${styles.container} ${styles.formGrid}`}>
          <ContactForm initialMessage={initialMessage} />
          <aside className={styles.helpColumn}>
            <div className={styles.helpCard}>
              <figure className={styles.helpVisual}>
                <Image src="/images/info/asesor-mostrador.webp" alt="Asesor de ColdPower ayudando a identificar un repuesto en el mostrador." fill sizes="(min-width: 1024px) 25vw, 100vw" className={styles.helpVisualImage} />
                <figcaption className={styles.helpVisualBadge}>Imagen referencial</figcaption>
              </figure>
              <p className={styles.cardEyebrow}>Para ayudarte mejor</p>
              <h2 className={styles.cardTitle}>¿Qué información puedes enviarnos?</h2>
              <p className={styles.cardIntro}>Entre más detalles nos compartas, podremos asesorarte mejor y enviarte una cotización más precisa.</p>
              <ul className={styles.infoList}>
                <InfoItem icon={Camera} text="Foto del repuesto o etiqueta" />
                <InfoItem icon={FileText} text="Modelo o código (SKU)" />
                <InfoItem icon={ClipboardList} text="Marca y especificaciones" />
                <InfoItem icon={Wrench} text="Aplicación o tipo de equipo" />
                <InfoItem icon={PackageCheck} text="Cualquier detalle adicional" />
              </ul>
            </div>
            {brands.length ? (
              <div className={styles.brandsCard}>
                <h2 className={styles.cardTitle}>Marcas y equipos que trabajamos</h2>
                <p className={styles.cardIntro}>Repuestos y equipos para refrigeración comercial, industrial y aire acondicionado.</p>
                <div className={styles.brandGrid}>
                  {brands.slice(0, 8).map((brand) => <span key={brand.id}>{brand.name}</span>)}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <section className={styles.coverageSection}>
        <div className={`${styles.container} ${styles.coverageGrid}`}>
          <div>
            <p className={styles.eyebrow}>Cobertura y atención</p>
            <h2 className={styles.sectionTitle}>Dónde atendemos</h2>
            <p className={styles.sectionLead}>{coverageCopy}</p>
            <div className={styles.coverageCards}>
              <CoverageCard icon={MapPin} title="Atención comercial" body="Te asesoramos desde nuestras sedes y canales digitales." />
              <CoverageCard icon={Truck} title="Despachos coordinados" body="Envíos coordinados según tu ubicación y disponibilidad." />
              <CoverageCard icon={Boxes} title={hasCoverage ? "Cobertura disponible" : "Cobertura por confirmar"} body={hasCoverage ? settings.coverage ?? "Coordinamos tu atención." : "Confirmamos opciones de atención con un asesor."} />
            </div>
            {settings.locations?.length ? (
              <div className={styles.locationList}>
                {settings.locations.map((location) => <span key={`${location.name}-${location.address ?? ""}`}><MapPin aria-hidden="true" /> {location.name}{location.address ? ` · ${location.address}` : ""}</span>)}
              </div>
            ) : null}
          </div>
          <div className={styles.coverageVisual}>
            <Image src={assets.coverage} alt="Mapa ilustrado de cobertura comercial de ColdPower." fill sizes="(min-width: 1024px) 42vw, 100vw" className={styles.coverageImage} />
            <div className={styles.coverageOverlay}>
              <p className={styles.coverageOverlayTitle}>{coverageHeading}</p>
              <p>{hasCoverage ? "Coordinamos atención comercial y despachos de acuerdo con tu ubicación." : "Coordinamos tu atención y confirmamos las opciones de despacho."}</p>
            </div>
            <div className={styles.coverageNote}><CircleAlert aria-hidden="true" /> La ubicación exacta de nuestras sedes se brindará al momento de confirmarla con un asesor comercial.</div>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <Image src={assets.cta} alt="" fill sizes="100vw" className={styles.ctaImage} aria-hidden="true" />
        <div className={`${styles.container} ${styles.ctaContent}`}>
          <div>
            <p className={styles.ctaEyebrow}>Asesoría ColdPower</p>
            <h2>¿Necesitas un repuesto, equipo o asesoría técnica?</h2>
            <p>Estamos listos para ayudarte. Cuéntanos tu proyecto y recibe una cotización personalizada.</p>
            <a href="#contact-form" className={styles.ctaButton}>Enviar consulta ahora <ArrowRight aria-hidden="true" /></a>
          </div>
          <div className={styles.ctaBenefits}>
            <span><Headphones aria-hidden="true" /> Asesoría experta</span>
            <span><Zap aria-hidden="true" /> Respuesta rápida</span>
            <span><BadgeCheck aria-hidden="true" /> Tu proyecto, nuestro respaldo</span>
          </div>
        </div>
      </section>
    </section>
  );
}

function Benefit({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return <div className={styles.benefit}><span className={styles.benefitIcon}><Icon aria-hidden="true" /></span><div><strong>{title}</strong><span>{body}</span></div></div>;
}

function ContactChannels({ phone, whatsapp, email, hours }: { phone: string; whatsapp: string; email: string; hours: string }) {
  return (
    <aside className={styles.channelsCard}>
      <div className={styles.channelsHeader}><div><p className={styles.cardEyebrow}>Atención directa</p><h2 className={styles.channelsTitle}>Canales de contacto</h2><p className={styles.channelsIntro}>Comunícate con nosotros por el canal que prefieras.</p></div><span className={styles.statusBadge}>Atención comercial</span></div>
      <div className={styles.channelList}>
        <Channel icon={Phone} label="Teléfono" value={phone} description="Habla directamente con un asesor." href={phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined} />
        {whatsapp ? <Channel icon={MessageCircle} tone="whatsapp" label="WhatsApp" value={whatsapp} description="Envíanos tu consulta por WhatsApp." href={createWhatsAppLink({ phone: whatsapp, message: "Hola ColdPower, necesito asesoría para un repuesto o equipo." })} /> : null}
        <Channel icon={Mail} label="Correo" value={email} description="Te respondemos a la brevedad." href={email ? `mailto:${email}` : undefined} />
        <Channel icon={Clock3} tone="orange" label="Horario de atención" value={hours} missingLabel="Horario por confirmar" description="Hora de Perú (GMT-5)." />
      </div>
      <div className={styles.specialistCard}><Headphones aria-hidden="true" /><div><strong>Atención comercial especializada</strong><p>Te ayudamos a encontrar el repuesto o equipo correcto para tu proyecto. Solicita una cotización personalizada.</p></div></div>
    </aside>
  );
}

function Channel({ icon: Icon, label, value, description, href, tone = "blue", missingLabel = "Disponible al configurar" }: { icon: LucideIcon; label: string; value: string; description: string; href?: string; tone?: "blue" | "whatsapp" | "orange"; missingLabel?: string }) {
  const content = <><span className={`${styles.channelIcon} ${styles[`channelIcon${tone[0].toUpperCase()}${tone.slice(1)}`]}`}><Icon aria-hidden="true" /></span><span className={styles.channelCopy}><strong>{label}</strong><b className={value ? "" : styles.channelMissing}>{value || missingLabel}</b><small>{description}</small></span><ChevronRight className={styles.channelArrow} aria-hidden="true" /></>;
  return href ? <a className={styles.channel} href={href} target={href.startsWith("https://") ? "_blank" : undefined} rel={href.startsWith("https://") ? "noreferrer" : undefined}>{content}</a> : <div className={styles.channel}>{content}</div>;
}

function ContactForm({ initialMessage }: { initialMessage?: string }) {
  const [values, setValues] = useState<ContactFormValues>({ ...initialForm, message: initialMessage ?? "" });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<FormStatus>("idle");
  const [serverMessage, setServerMessage] = useState("");
  const requestId = useRef<string>(createRequestId());
  const fileInput = useRef<HTMLInputElement>(null);

  function update(field: keyof ContactFormValues, value: string | boolean) { setValues((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: "" })); }
  function chooseFile(next: File | null) {
    if (next) {
      const extension = next.name.split(".").pop()?.toLowerCase() ?? "";
      if (!allowedExtensions.includes(extension) || next.size > 10 * 1024 * 1024) { setErrors((current) => ({ ...current, attachment: "Adjunta un JPG, PNG, WEBP o PDF de máximo 10 MB." })); return; }
    }
    setErrors((current) => ({ ...current, attachment: "" })); setFile(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerMessage("");
    const validation = validatePublicContactPayload({ ...values, requestId: requestId.current });
    if (!validation.ok) { setErrors(validation.errors as Record<string, string>); setServerMessage("Revisa los datos marcados antes de enviar la consulta."); setStatus("error"); return; }
    if (errors.attachment) { setStatus("error"); return; }
    setStatus("submitting"); setErrors({});
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) => form.append(key, String(value)));
    form.append("requestId", requestId.current);
    if (file) form.append("attachment", file);
    try {
      const response = await fetch("/api/contacto", { method: "POST", body: form });
      const result = await response.json() as { success?: boolean; message?: string; errors?: Record<string, string> };
      if (!response.ok || !result.success) { setErrors(result.errors ?? {}); setServerMessage(result.message ?? "No pudimos enviar tu consulta."); setStatus("error"); return; }
      setValues(initialForm); setFile(null); if (fileInput.current) fileInput.current.value = ""; setServerMessage(result.message ?? "Consulta enviada correctamente."); setStatus("success");
    } catch { setServerMessage("No pudimos enviar tu consulta. Revisa tu conexión e intenta nuevamente."); setStatus("error"); }
  }

  if (status === "success") return <div id="contact-form" className={styles.formCard}><div className={styles.successState}><span><Check aria-hidden="true" /></span><p className={styles.cardEyebrow}>Consulta recibida</p><h2 className={styles.formTitle}>Consulta enviada correctamente.</h2><p>Nuestro equipo comercial se pondrá en contacto contigo.</p><Link href="/catalogo" className={styles.secondaryButton}>Seguir explorando el catálogo <ArrowRight aria-hidden="true" /></Link></div></div>;

  return (
    <form id="contact-form" className={styles.formCard} onSubmit={submit} noValidate>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className={styles.visuallyHidden} />
      <div className={styles.formHeader}><div><p className={styles.cardEyebrow}>Estamos para ayudarte</p><h2 className={styles.formTitle}>Envía tu consulta o solicita una cotización</h2><p className={styles.formIntro}>Completa el formulario y nuestro equipo se pondrá en contacto contigo.</p></div></div>
      <div className={styles.formFields}>
        <Field label="Nombre completo" required error={errors.name}><input id="contact-name" required value={values.name} onChange={(event) => update("name", event.target.value)} className={styles.input} autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "contact-name-error" : undefined} /></Field>
        <Field label="Empresa" error={errors.company}><input id="contact-company" value={values.company} onChange={(event) => update("company", event.target.value)} className={styles.input} autoComplete="organization" placeholder="Nombre de tu empresa" /></Field>
        <Field label="Teléfono" required error={errors.phone}><input id="contact-phone" required value={values.phone} onChange={(event) => update("phone", event.target.value)} className={styles.input} autoComplete="tel" inputMode="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "contact-phone-error" : undefined} placeholder="+51 987 654 321" /></Field>
        <Field label="Correo electrónico" required error={errors.email}><input id="contact-email" type="email" required value={values.email} onChange={(event) => update("email", event.target.value)} className={styles.input} autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "contact-email-error" : undefined} placeholder="tu@empresa.com" /></Field>
        <Field label="Mensaje / Referencia / SKU" required error={errors.message} full><textarea id="contact-message" required value={values.message} onChange={(event) => update("message", event.target.value)} className={`${styles.input} ${styles.textarea}`} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "contact-message-error" : undefined} placeholder="Cuéntanos qué producto necesitas, incluye modelo, marca, SKU o una descripción. También puedes indicar la aplicación de tu proyecto." rows={5} /></Field>
      </div>
      <div className={styles.fileRow}>
        <Paperclip aria-hidden="true" />
        <div className={styles.fileCopy}><strong>Adjuntar foto o referencia <em>(opcional)</em></strong><span>{file ? `${file.name} · ${formatFileSize(file.size)}` : "Puedes subir una imagen del repuesto, etiqueta o modelo."}</span></div>
        {file ? <button type="button" className={styles.fileRemove} onClick={() => chooseFile(null)} aria-label="Quitar archivo adjunto"><X aria-hidden="true" /></button> : <><input ref={fileInput} id="contact-file" aria-label="Adjuntar foto o referencia" type="file" className={styles.visuallyHidden} accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} /><button type="button" className={styles.fileButton} onClick={() => fileInput.current?.click()}><Upload aria-hidden="true" /> Seleccionar archivo</button></>}
      </div>
      {errors.attachment ? <p className={styles.fieldError} role="alert">{errors.attachment}</p> : null}
      <div className={styles.formBottom}>
        <label className={styles.consent}><input type="checkbox" required name="consent" checked={values.consent} onChange={(event) => update("consent", event.target.checked)} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "contact-consent-error" : undefined} /> <span>Acepto que ColdPower use mis datos para atender esta consulta.</span></label>
        {errors.consent ? <span id="contact-consent-error" className={styles.fieldError} role="alert">{errors.consent}</span> : null}
        <div className={styles.submitRow}><button type="submit" className={styles.submitButton} disabled={status === "submitting"}>{status === "submitting" ? "Enviando..." : <><Send aria-hidden="true" /> Enviar consulta</>}</button><span className={styles.privacy}><LockKeyhole aria-hidden="true" /> Tus datos se usarán solo para atender tu consulta.</span></div>
      </div>
      {serverMessage ? <p className={`${styles.formMessage} ${status === "error" ? styles.formMessageError : ""}`} role={status === "error" ? "alert" : "status"}>{serverMessage}</p> : null}
    </form>
  );
}

function Field({ label, required = false, error, full = false, children }: { label: string; required?: boolean; error?: string; full?: boolean; children: ReactNode }) { return <label className={`${styles.field} ${full ? styles.fieldFull : ""}`}><span>{label}{required ? <b aria-hidden="true"> *</b> : null}</span>{children}{error ? <small id={`${(children as ReactElement<{ id?: string }>).props.id}-error`} className={styles.fieldError}>{error}</small> : null}</label>; }
function InfoItem({ icon: Icon, text }: { icon: LucideIcon; text: string }) { return <li><Icon aria-hidden="true" /><span>{text}</span></li>; }
function CoverageCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) { return <article className={styles.coverageCard}><span><Icon aria-hidden="true" /></span><strong>{title}</strong><p>{body}</p></article>; }
function createRequestId() { return `contact-${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`; }
function formatFileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
