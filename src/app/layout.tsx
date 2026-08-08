import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { TopBar } from "@/components/layout/TopBar";
import { CartProvider } from "@/components/cart/CartProvider";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { WhatsAppCTA } from "@/components/shared/WhatsAppCTA";
import { company } from "@/data/company";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(company.domain),
  title: {
    default: "ColdPower | Equipos y repuestos de refrigeración y aire acondicionado en Perú",
    template: "%s | ColdPower",
  },
  description:
    "Tienda peruana especializada en equipos y repuestos de refrigeración, aire acondicionado (distribuidor Carrier) y línea blanca, con garantía, asesoría especializada y envíos a todo el Perú.",
  applicationName: company.commercialName,
  keywords: [
    "aire acondicionado en Perú",
    "repuestos de refrigeración",
    "distribuidor Carrier",
    "compresores",
    "repuestos línea blanca",
    "ColdPower",
  ],
  openGraph: {
    title: "ColdPower",
    description: "Equipos y repuestos de refrigeración y aire acondicionado con garantía para todo el Perú.",
    url: company.domain,
    type: "website",
    locale: "es_PE",
    siteName: company.commercialName,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-PE" className={`${inter.variable} ${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <CartProvider>
          <PreviewBanner />
          <TopBar />
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <WhatsAppCTA />
        </CartProvider>
      </body>
    </html>
  );
}
