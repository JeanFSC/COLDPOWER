import type { Metadata } from "next";
import { getCatalogBrands, type CatalogBrand } from "@/lib/catalog-repository";
import { getCmsPage } from "@/lib/cms-repository";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";
import { getPublishedMediaSlots } from "@/lib/media-repository";
import { ContactPage, type ContactPageAssets } from "@/components/contact/ContactPage";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Comunícate con ColdPower para cotizar equipos y repuestos con asesoría técnica y comercial.",
};

const fallbackAssets: ContactPageAssets = {
  hero: "/images/contact-hero-coldpower.webp",
  coverage: "/images/contact-coverage-peru.webp",
  cta: "/images/contact-cta-cooling.webp",
};

type ContactPageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function ContactRoute({ searchParams }: ContactPageProps) {
  const params = (await searchParams) ?? {};
  const context = getContactContext(getParam(params.motivo));
  const [settings, brands, assets] = await Promise.all([
    getPublicCompanySettings(),
    safeBrands(),
    resolveContactAssets(),
  ]);
  return <ContactPage settings={settings} brands={brands} assets={assets} initialMessage={context.initialMessage} />;
}

async function safeBrands(): Promise<CatalogBrand[]> {
  try {
    return (await getCatalogBrands()).filter((brand) => brand.productCount > 0);
  } catch (error) {
    console.warn("[ColdPower] Marcas públicas no disponibles para Contacto.", error instanceof Error ? error.message : error);
    return [];
  }
}

async function resolveContactAssets(): Promise<ContactPageAssets> {
  try {
    const cms = await getCmsPage("contacto", true);
    if (!cms?.page.id) return fallbackAssets;
    const slots = await getPublishedMediaSlots("cms_page", cms.page.id);
    return { hero: slots.get("hero") ?? fallbackAssets.hero, coverage: slots.get("coverage") ?? fallbackAssets.coverage, cta: slots.get("cta") ?? fallbackAssets.cta };
  } catch (error) {
    console.warn("[ColdPower] Media CMS de Contacto no disponible; se usa fallback versionado.", error instanceof Error ? error.message : error);
    return fallbackAssets;
  }
}

const contactContexts = {
  "no-encontre": "No encontré mi producto. Necesito ayuda para identificarlo y confirmar compatibilidad.",
  validacion: "Necesito validar una alternativa antes de cotizar. Comparto la referencia y el modelo disponible.",
  "ayuda-tecnica": "Necesito ayuda técnica para elegir el repuesto o equipo correcto para mi proyecto.",
} as const;

function getContactContext(value: string | undefined) { return value && value in contactContexts ? { initialMessage: contactContexts[value as keyof typeof contactContexts] } : { initialMessage: undefined }; }
function getParam(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
