import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/catalog-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const requestedLimit = Number(url.searchParams.get("limit") ?? "8");
  const limit = Math.min(12, Math.max(1, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 8));

  if (query.length < 2) return NextResponse.json({ success: true, query, products: [] });

  try {
    const result = await getCatalogProducts({ query, pageSize: limit });
    const products = result.products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      category: product.category,
      status: product.status,
      price: product.price,
      priceCurrency: product.priceCurrency,
    }));

    return NextResponse.json({ success: true, query, products });
  } catch (error) {
    console.error("ColdPower: búsqueda sin catálogo persistente", error);
    return NextResponse.json(
      { success: false, message: "El catálogo persistente no está disponible. Inténtalo nuevamente." },
      { status: 503 },
    );
  }
}
