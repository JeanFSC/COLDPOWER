import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { legalDocuments } from "@/lib/legal-documents";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cambios y devoluciones | ColdPower", description: legalDocuments.returns.description };

export default async function ReturnsPage() {
  const settings = await getPublicCompanySettings();
  if (!settings.legalPagesPublished) notFound();
  return <LegalDocumentPage document={legalDocuments.returns} />;
}
