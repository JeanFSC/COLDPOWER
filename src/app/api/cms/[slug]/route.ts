import { NextResponse } from "next/server";
import { getCmsPage } from "@/lib/cms-repository";
import { validateCmsPageSlug } from "@/lib/cms-validation";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; if (!validateCmsPageSlug(slug)) return NextResponse.json({ error: "Página CMS inválida." }, { status: 400 }); const cms = await getCmsPage(slug, true); return NextResponse.json({ cms: cms ? { page: cms.page, blocks: cms.blocks } : null }); }
