import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { CompareBar } from "@/components/catalog/CompareBar";
import { CompareProvider } from "@/components/catalog/CompareProvider";
import { AppChrome } from "@/components/layout/AppChrome";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { TechnicalNav } from "@/components/layout/TechnicalNav";
import { TopBar } from "@/components/layout/TopBar";
import { CartProvider } from "@/components/cart/CartProvider";
import { ShoppingCartProvider } from "@/components/shopping-cart/ShoppingCartProvider";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { WhatsAppCTA } from "@/components/shared/WhatsAppCTA";
import { coldPowerClerkLocalization } from "@/components/auth/clerkAppearance";
import { company } from "@/data/company";
import { getOptionalUserId } from "@/lib/auth";
import { authConfig, isAuthConfigured } from "@/lib/env";
import { getCatalogCategories, getCatalogFamilies, getCatalogProductTypes, type CatalogCategory, type CatalogFamily, type CatalogProductType } from "@/lib/catalog-repository";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const revalidate = 300;
export const metadata: Metadata = {
  metadataBase: new URL(company.domain),
  title: {
    default: "ColdPower | Catálogo técnico de refrigeración y climatización",
    template: "%s | ColdPower",
  },
  description:
    "Catálogo técnico de equipos y repuestos HVAC con búsqueda por código, validación de compatibilidad y cotización asistida en Perú.",
  applicationName: company.commercialName,
  keywords: [
    "catálogo técnico HVAC Perú",
    "repuestos de refrigeración",
    "compresores",
    "aire acondicionado",
    "cotización técnica",
    "ColdPower",
  ],
  openGraph: {
    title: "ColdPower | Catálogo técnico HVAC",
    description: "Encuentra, valida y cotiza equipos y repuestos de climatización.",
    url: company.domain,
    type: "website",
    locale: "es_PE",
    siteName: company.commercialName,
    images: [{ url: "/images/og/og-tienda.webp", width: 1200, height: 630, alt: "ColdPower catálogo técnico" }],
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [categories, navigationCategories, families, productTypes, publicSettings, devAuthUserId] = await Promise.all([
    loadShellCategories(),
    loadNavigationCategories(),
    loadNavigationFamilies(),
    loadNavigationProductTypes(),
    getPublicCompanySettings(),
    process.env.CP_DEV_AUTH_BYPASS === "true" && process.env.CP_DEV_AUTH_USER_ID
      ? getOptionalUserId()
      : Promise.resolve(null),
  ]);
  const body = (
    <CartProvider>
      <ShoppingCartProvider>
      <CompareProvider>
        <AppChrome
          publicBefore={
            <>
              <PreviewBanner />
              <TopBar />
              <Header authEnabled={isAuthConfigured} categories={categories} devAuthUserId={devAuthUserId} />
              <TechnicalNav categories={navigationCategories} families={families} productTypes={productTypes} />
            </>
          }
          publicAfter={
            <>
              <Footer categories={categories} settings={publicSettings} />
              <WhatsAppCTA />
            </>
          }
        >
          {children}
        </AppChrome>
        <CompareBar />
      </CompareProvider>
      </ShoppingCartProvider>
    </CartProvider>
  );
  return (
    <html
      lang="es-PE"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {isAuthConfigured ? (
          <ClerkProvider
            publishableKey={authConfig.clerkPublishableKey!}
            localization={coldPowerClerkLocalization}
            signInUrl={authConfig.signInUrl}
            signUpUrl={authConfig.signUpUrl}
            signInFallbackRedirectUrl="/auth/after-sign-in"
            signUpFallbackRedirectUrl="/auth/after-sign-in"
            afterSignOutUrl="/"
          >
            {body}
          </ClerkProvider>
        ) : (
          body
        )}
      </body>
    </html>
  );
}

async function loadShellCategories(): Promise<CatalogCategory[]> {
  try {
    const categories = await getCatalogCategories();
    return categories.filter((category) => category.productCount > 0);
  } catch (error) {
    console.warn(
      "[ColdPower] Categorías persistentes no disponibles para la navegación.",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

async function loadNavigationCategories(): Promise<CatalogCategory[]> {
  try {
    const categories = await getCatalogCategories(false);
    return categories.map((category) => ({ ...category, productCount: 0 }));
  } catch (error) {
    console.warn(
      "[ColdPower] Taxonomía persistente no disponible para el menú de categorías.",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

async function loadNavigationFamilies(): Promise<CatalogFamily[]> {
  try {
    const families = await getCatalogFamilies(undefined, false);
    return families.map((family) => ({ ...family, productCount: 0 }));
  } catch (error) {
    console.warn(
      "[ColdPower] Familias persistentes no disponibles para el menú de categorías.",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

async function loadNavigationProductTypes(): Promise<CatalogProductType[]> {
  try {
    const productTypes = await getCatalogProductTypes();
    return productTypes.map((productType) => ({ ...productType, productCount: 0 }));
  } catch (error) {
    console.warn(
      "[ColdPower] Tipos de producto publicados no disponibles para el menú de categorías.",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
