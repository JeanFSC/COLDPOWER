import { NextResponse } from "next/server";
import { getPublicCompanySettings } from "@/lib/company-settings-runtime";

export async function GET() {
  try {
    const settings = await getPublicCompanySettings();
    return NextResponse.json({ configured: Boolean(settings.whatsapp?.trim()) });
  } catch {
    return NextResponse.json({ configured: false });
  }
}
