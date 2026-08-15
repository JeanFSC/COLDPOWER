import { NextResponse } from "next/server";
import { getCatalogProductsByIds } from "@/lib/catalog-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = [...new Set((url.searchParams.get("ids") ?? "").split(",").map((id) => id.trim()).filter(Boolean))].slice(0, 48);
  if (ids.length === 0) return NextResponse.json({ success: true, products: [] });

  try {
    const products = await getCatalogProductsByIds(ids);
    return NextResponse.json({
      success: true,
      products: products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        sku: product.sku,
        price: product.price,
        priceCurrency: product.priceCurrency,
        images: product.images,
        status: product.status,
      })),
    });
  } catch (error) {
    console.error("ColdPower: resolución sin catálogo persistente", error);
    return NextResponse.json(
      { success: false, message: "El catálogo persistente no está disponible. Inténtalo nuevamente." },
      { status: 503 },
    );
  }
}
