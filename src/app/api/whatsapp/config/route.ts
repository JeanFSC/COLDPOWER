import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { companySettings } from "@/db/schema";
import { company } from "@/data/company";

export async function GET() {
  try {
    const [settings] = await getDb().select({ whatsapp: companySettings.whatsapp }).from(companySettings).limit(1);
    return NextResponse.json({ configured: Boolean(settings?.whatsapp?.trim() || company.whatsapp.trim()) });
  } catch {
    return NextResponse.json({ configured: Boolean(company.whatsapp.trim()) });
  }
}
