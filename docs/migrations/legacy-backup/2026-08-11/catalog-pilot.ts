import type { EditorialPublication } from "@/types/catalog";
import type { Product, ProductSpec } from "@/types/product";

/**
 * Editorial pilot generated from the real inventory export. The source has
 * product names and active status, but no reliable prices, stock, MPN or
 * separate brand/model columns. Those fields remain explicitly quotable.
 */
export const catalogPilotSource = {
  document: "Commerial Invoice MTI 260423L1-1 (1).pdf",
  inventoryRows: 1359,
  selectedRows: 90,
  importedAt: "2026-08-10",
} as const;

export const catalogPilotIds = [
  "prod-ref-0069",
  "prod-ref-0070",
  "prod-ref-0071",
  "prod-ref-0072",
  "prod-ref-0073",
  "prod-ref-0074",
  "prod-ref-0075",
  "prod-ref-0322",
  "prod-ref-0381",
  "prod-ref-0414",
  "prod-ref-0428",
  "prod-ref-0103",
  "prod-ref-0104",
  "prod-ref-0105",
  "prod-ref-0106",
  "prod-ref-0107",
  "prod-ref-0108",
  "prod-ref-0114",
  "prod-ref-0115",
  "prod-ref-0116",
  "prod-ref-0117",
  "prod-ref-0124",
  "prod-ref-0129",
  "prod-ref-0130",
  "prod-ref-0136",
  "prod-ref-0137",
  "prod-ref-0147",
  "prod-ref-0148",
  "prod-ref-0227",
  "prod-ref-0032",
  "prod-ref-0034",
  "prod-ref-0035",
  "prod-ref-0164",
  "prod-ref-0347",
  "prod-ref-0036",
  "prod-ref-0357",
  "prod-ref-0055",
  "prod-ref-0056",
  "prod-ref-0057",
  "prod-ref-0416",
  "prod-ref-0005",
  "prod-ref-0006",
  "prod-ref-0367",
  "prod-ref-0008",
  "prod-ref-0020",
  "prod-ref-0259",
  "prod-ref-0021",
  "prod-ref-0324",
  "prod-ref-0077",
  "prod-ref-0078",
  "prod-ref-0079",
  "prod-ref-0084",
  "prod-ref-0355",
  "prod-ref-0391",
  "prod-ref-0392",
  "prod-ref-0297",
  "prod-ref-0305",
  "prod-ref-0312",
  "prod-ref-0325",
  "prod-ref-0326",
  "prod-ref-0194",
  "prod-ref-0196",
  "prod-ref-0154",
  "prod-ref-0159",
  "prod-ref-0176",
  "prod-ref-0184",
  "prod-ref-0183",
  "prod-ref-0185",
  "prod-ref-0186",
  "prod-ref-0187",
  "prod-ref-0001",
  "prod-ref-0250",
  "prod-ref-0205",
  "prod-ref-0340",
  "prod-ref-0004",
  "prod-ref-0022",
  "prod-ref-0065",
  "prod-ref-0208",
  "prod-ref-0306",
  "prod-ref-0370",
  "prod-ref-0228",
  "prod-ref-0230",
  "prod-ref-0231",
  "prod-ref-0232",
  "prod-ref-0233",
  "prod-ref-0234",
  "prod-ref-0238",
  "prod-ref-0239",
  "prod-ref-0240",
  "prod-ref-0243",
] as const;

export const catalogPilot = {
  source: catalogPilotSource,
  productIds: catalogPilotIds,
} as const;

const pilotIdSet = new Set<string>(catalogPilotIds);

const brandAliases: Record<string, string> = {
  bosh: "Bosch",
  coldex: "Coldex",
  coldpoint: "ColdPoint",
  coldpower: "ColdPower",
  cubigel: "Cubigel",
  danfoos: "Danfoss",
  ducatti: "Ducatti",
  ducatty: "Ducatti",
  elco: "Elco",
  ego: "EGO",
  embraco: "Embraco",
  electrolux: "Electrolux",
  "general electric": "General Electric",
  globalcap: "Global Cap",
  "global cap": "Global Cap",
  indurama: "Indurama",
  itc: "ITC",
  lg: "LG",
  mabe: "Mabe",
  mars: "Mars",
  miray: "Miray",
  pedsu: "Pedsu",
  quality: "Quality",
  rainbox: "Rainbox",
  roberthaw: "Robertshaw",
  robertshaw: "Robertshaw",
  samsung: "Samsung",
  siemens: "Siemens",
  sole: "Sole",
  supco: "Supco",
  tecunseh: "Tecunseh",
};

function normalizeBrand(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function canonicalBrand(value: string) {
  return brandAliases[normalizeBrand(value)] ?? value.trim();
}

function getTechnicalSpecs(product: Product): ProductSpec[] {
  return [
    { label: "Familia técnica", value: product.type },
    { label: "Estado en inventario", value: "Activo en el PDF fuente" },
    { label: "Disponibilidad", value: "Cotizar con asesor" },
  ];
}

export function getCatalogPilotOverride(product: Product) {
  if (!pilotIdSet.has(product.id)) return undefined;

  const editorial: EditorialPublication = {
    approved: true,
    reviewedBy: "ColdPower · piloto editorial",
    verifiedAt: catalogPilotSource.importedAt,
    imageApproved: true,
    documentsVerified: true,
    seoApproved: true,
    sourceDocument: catalogPilotSource.document,
    dataConfidence: "source-name-only",
  };

  return {
    brand: canonicalBrand(product.brand),
    compatibility: [
      "Aplicación en refrigeración/HVAC",
      "Compatibilidad exacta por confirmar con asesor técnico",
    ],
    specs: getTechnicalSpecs(product),
    editorial,
  };
}
