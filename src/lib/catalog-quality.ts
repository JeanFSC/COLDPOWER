export type CatalogQualityLevel = "good" | "acceptable" | "poor";

export type CatalogQualitySource = {
  name?: string | null;
  commercialName?: string | null;
  normalizedName?: string | null;
  originalName?: string | null;
  categoryName?: string | null;
  familyName?: string | null;
  brandName?: string | null;
  productType?: string | null;
  originalReferenceCode?: string | null;
  modelCode?: string | null;
  application?: string | null;
  compatibilityBrands?: string[] | null;
  voltage?: string | null;
  power?: string | null;
  frequency?: string | null;
  rpm?: string | null;
  amperage?: string | null;
  capacitance?: string | null;
  refrigerant?: string | null;
  horsepower?: string | null;
  temperature?: string | null;
  dimensions?: string | null;
  length?: string | null;
  connectionSize?: string | null;
  editorialDescription?: string | null;
  unitOfMeasure?: string | null;
  sourceStatus?: string | null;
  requiresReview?: boolean | null;
  possibleDuplicate?: boolean | null;
  duplicateDecision?: "pending" | "different" | "confirmed" | "keep_both" | null;
  hasPrimaryImage?: boolean;
  hasAltText?: boolean;
  hasSecondImage?: boolean;
};

export type CatalogQuality = {
  score: number;
  level: CatalogQualityLevel;
  missingFields: string[];
};

const technicalFields: Array<[keyof CatalogQualitySource, string]> = [
  ["voltage", "voltaje"],
  ["power", "potencia"],
  ["frequency", "frecuencia"],
  ["rpm", "rpm"],
  ["amperage", "amperaje"],
  ["capacitance", "capacitancia"],
  ["refrigerant", "refrigerante"],
  ["horsepower", "potencia HP"],
  ["temperature", "temperatura"],
  ["dimensions", "medidas"],
  ["length", "longitud"],
  ["connectionSize", "medida de conexión"],
];

function present(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function isActiveSource(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "activo" || normalized === "active";
}

export function calculateCatalogQuality(product: CatalogQualitySource): CatalogQuality {
  let score = 0;
  const missingFields: string[] = [];
  const effectiveName = product.name ?? product.commercialName ?? product.normalizedName ?? product.originalName;

  if (present(effectiveName)) score += 7;
  else missingFields.push("nombre comercial");
  if (present(product.categoryName)) score += 5;
  else missingFields.push("categoría");
  if (present(product.familyName)) score += 5;
  else missingFields.push("familia");
  if (present(product.brandName)) score += 4;
  else missingFields.push("marca");
  if (present(product.productType)) score += 4;
  else missingFields.push("tipo de producto");

  if (present(product.modelCode) || present(product.originalReferenceCode)) score += 5;
  else missingFields.push("modelo/referencia técnica");
  if (present(product.application)) score += 5;
  else missingFields.push("aplicación");
  if (product.compatibilityBrands?.some(present)) score += 5;
  else missingFields.push("compatibilidades");
  const specifications = technicalFields.filter(([field]) => present(product[field])).length;
  if (specifications >= 1) score += 5;
  if (specifications >= 2) score += 5;
  if (specifications === 0) missingFields.push("especificaciones técnicas");
  else if (specifications === 1) missingFields.push("una especificación técnica adicional");

  const descriptionLength = product.editorialDescription?.trim().length ?? 0;
  if (descriptionLength >= 80) score += 12;
  else if (descriptionLength >= 24) score += 6;
  else missingFields.push("descripción comercial completa");
  if (present(product.unitOfMeasure)) score += 3;
  else missingFields.push("unidad de medida");
  if (isActiveSource(product.sourceStatus)) score += 5;
  else missingFields.push("origen activo");

  if (product.hasPrimaryImage) score += 12;
  else missingFields.push("imagen principal");
  if (product.hasAltText) score += 4;
  else if (product.hasPrimaryImage) missingFields.push("texto alternativo");
  if (product.hasSecondImage) score += 4;
  else missingFields.push("segunda imagen");

  if (product.requiresReview === false) score += 5;
  else missingFields.push("revisión editorial");
  const duplicateResolved = !product.possibleDuplicate || ["different", "confirmed", "keep_both"].includes(product.duplicateDecision ?? "");
  if (duplicateResolved) score += 5;
  else missingFields.push("decisión de duplicado");

  const boundedScore = Math.max(0, Math.min(100, score));
  return {
    score: boundedScore,
    level: boundedScore >= 80 ? "good" : boundedScore >= 60 ? "acceptable" : "poor",
    missingFields: [...new Set(missingFields)],
  };
}

