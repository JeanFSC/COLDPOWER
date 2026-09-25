import { getAvailabilityLabel, type AvailabilityStatus, type PublicationStatus } from "@/lib/publication-governance";
import type { Product, ProductSpec, ProductStatus } from "@/types/product";

export type CatalogProductSourceRow = {
  product: {
    id: string;
    sku: string;
    slug: string;
    originalName: string;
    normalizedName: string;
    commercialName?: string | null;
    featured?: boolean;
    productType: string;
    taxType?: string | null;
    compatibilityBrands: string[] | null;
    modelCode: string | null;
    application: string | null;
    voltage: string | null;
    power: string | null;
    frequency: string | null;
    rpm: string | null;
    amperage: string | null;
    capacitance: string | null;
    refrigerant: string | null;
    horsepower: string | null;
    temperature: string | null;
    dimensions: string | null;
    length: string | null;
    connectionSize: string | null;
    unitOfMeasure: string | null;
    status: string;
    publicationStatus?: PublicationStatus;
    availabilityStatus?: AvailabilityStatus;
    editorialDescription?: string | null;
    images?: string[];
    price?: number | null;
    priceCurrency?: string | null;
    oldPrice?: number | null;
    discount?: number | null;
    onSale?: boolean;
  };
  category: { name: string; slug: string };
  family: { id?: string; name: string; slug: string };
  brand: { name: string } | null;
};

const technicalFields: Array<{ label: string; field: keyof CatalogProductSourceRow["product"] }> = [
  { label: "Modelo/Código", field: "modelCode" },
  { label: "Aplicación", field: "application" },
  { label: "Voltaje", field: "voltage" },
  { label: "Potencia", field: "power" },
  { label: "Frecuencia", field: "frequency" },
  { label: "RPM", field: "rpm" },
  { label: "Amperaje", field: "amperage" },
  { label: "Capacitancia", field: "capacitance" },
  { label: "Refrigerante", field: "refrigerant" },
  { label: "Potencia HP", field: "horsepower" },
  { label: "Temperatura", field: "temperature" },
  { label: "Medidas", field: "dimensions" },
  { label: "Longitud", field: "length" },
  { label: "Conexión", field: "connectionSize" },
  { label: "Unidad de medida", field: "unitOfMeasure" },
];

export function mapCatalogProductRow(row: CatalogProductSourceRow): Product {
  const name = row.product.commercialName?.trim() || row.product.normalizedName || row.product.originalName;
  const specs: ProductSpec[] = technicalFields.flatMap(({ label, field }) => {
    const value = row.product[field];
    return typeof value === "string" && value.trim() ? [{ label, value: value.trim() }] : [];
  });
  const familyLabel = row.family.name.trim();
  const editorialDescription = row.product.editorialDescription?.trim();
  const shortDescription = editorialDescription || `${name}. Referencia de catálogo para la familia ${familyLabel}.`;
  const longDescription = editorialDescription || [
    `${name}.`,
    `SKU: ${row.product.sku}.`,
    `Familia: ${familyLabel}.`,
    "Precio, disponibilidad y compatibilidad exacta deben confirmarse con un asesor ColdPower.",
  ].join(" ");
  const availabilityStatus = row.product.availabilityStatus ?? "unknown";
  return {
    id: row.product.id,
    slug: row.product.slug,
    name,
    originalName: row.product.originalName,
    commercialName: row.product.commercialName ?? null,
    category: row.category.name.trim(),
    family: familyLabel,
    familyId: row.family.id,
    brand: row.brand?.name.trim() ?? "",
    price: row.product.price ?? null,
    priceCurrency: row.product.priceCurrency ?? null,
    oldPrice: row.product.oldPrice ?? undefined,
    discount: row.product.discount ?? undefined,
    stock: null,
    sku: row.product.sku,
    status: mapSourceStatus(row.product.status),
    sourceStatus: row.product.status,
    availabilityStatus,
    publicationStatus: row.product.publicationStatus,
    taxType: row.product.taxType ?? null,
    type: row.product.productType,
    origin: "IMPORT_PRODUCTOS",
    compatibility: [],
    compatibilityBrands: row.product.compatibilityBrands ?? [],
    specs,
    images: row.product.images ?? [],
    shortDescription,
    longDescription,
    description: longDescription,
    featured: row.product.featured ?? false,
    onSale: row.product.onSale ?? false,
    relatedIds: [],
  };
}

export function mapSourceStatus(sourceStatus: string): ProductStatus {
  const value = sourceStatus.trim().toLowerCase();
  if (value.includes("inactiv") || value.includes("agot")) return "out-of-stock";
  if (value === "in-stock" || value === "low-stock" || value === "on-request" || value === "out-of-stock") return value;
  return "on-request";
}

export function getProductAvailabilityLabel(status: AvailabilityStatus | null | undefined) {
  return getAvailabilityLabel(status);
}
