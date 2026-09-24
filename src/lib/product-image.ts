export const GENERIC_PRODUCT_IMAGE =
  "/images/categories/repuestos-y-accesorios-generales.webp";

export type ProductImageInput = {
  images?: readonly (string | null | undefined)[] | null;
  family?: string | null;
  familySlug?: string | null;
  category?: string | null;
  categorySlug?: string | null;
};

export type ProductImageResolution = {
  src: string;
  images: string[];
  isReference: boolean;
  source: "media" | "family" | "category" | "generic";
};

const familyPlaceholders = [
  { slug: "compresores", aliases: ["compresor", "compresores", "motocompresor", "motocompresores"] },
  { slug: "capacitores", aliases: ["capacitor", "capacitores"] },
  {
    slug: "tarjetas-electronicas",
    aliases: [
      "tarjeta-electronica",
      "tarjetas-electronicas",
      "tarjeta-electronica-de-control",
      "tarjetas-electronicas-de-control",
    ],
  },
  {
    slug: "motores-ventiladores",
    aliases: [
      "motor-ventilador",
      "motores-ventiladores",
      "motor-de-ventilador",
      "motores-y-ventiladores",
      "motor",
      "motores",
      "ventilador",
      "ventiladores",
    ],
  },
  {
    slug: "termostatos-controles",
    aliases: [
      "termostato",
      "termostatos",
      "control",
      "controles",
      "controlador-de-temperatura",
      "controladores-de-temperatura",
      "termostatos-y-controles",
    ],
  },
  {
    slug: "valvulas-filtros",
    aliases: [
      "valvula",
      "valvulas",
      "filtro",
      "filtros",
      "valvulas-y-filtros",
    ],
  },
  { slug: "refrigerantes", aliases: ["refrigerante", "refrigerantes"] },
  { slug: "herramientas", aliases: ["herramienta", "herramientas"] },
  { slug: "resistencias", aliases: ["resistencia", "resistencias"] },
  {
    slug: "timers-sensores",
    aliases: ["timer", "timers", "sensor", "sensores", "temporizador", "temporizadores", "timers-y-sensores"],
  },
] as const;

const universalFamilyPlaceholders = new Set([
  "capacitores",
  "tarjetas-electronicas",
  "termostatos-controles",
  "resistencias",
  "timers-sensores",
]);

const compatibleFamilyCategoryAliases = [
  "refrigeracion",
  "aire-acondicionado",
  "congeladoras",
  "conexiones-y-accesorios",
  "herramientas-y-equipos",
  "multilinea",
] as const;

const noCategoryAliases = new Set(["sin-categoria", "sin-clasificar", "uncategorized"]);

const categoryImageAliases = [
  { slug: "aire-acondicionado", aliases: ["aire-acondicionado"] },
  { slug: "arrocera", aliases: ["arrocera", "arroceras"] },
  { slug: "bomba-de-agua", aliases: ["bomba-de-agua", "bombas-de-agua"] },
  { slug: "campana-extractora", aliases: ["campana-extractora", "campanas-extractoras"] },
  { slug: "cocina", aliases: ["cocina", "cocinas"] },
  { slug: "equipos", aliases: ["equipos"] },
  { slug: "extractor", aliases: ["extractor"] },
  { slug: "herramientas", aliases: ["herramienta", "herramientas", "herramientas-y-equipos"] },
  { slug: "hervidor", aliases: ["hervidor", "hervidores"] },
  { slug: "lavadora", aliases: ["lavadora", "lavadoras"] },
  { slug: "licuadora", aliases: ["licuadora", "licuadoras"] },
  { slug: "linea-blanca", aliases: ["linea-blanca"] },
  { slug: "lustradoras", aliases: ["lustradora", "lustradoras"] },
  { slug: "motores-automotrices", aliases: ["automotriz", "motores-automotrices"] },
  { slug: "otros-electrodomesticos", aliases: ["otros-electrodomesticos"] },
  { slug: "plancha", aliases: ["plancha", "planchas"] },
  { slug: "refrigeracion", aliases: ["refrigeracion"] },
  { slug: "repuestos", aliases: ["repuesto", "repuestos"] },
  { slug: "repuestos-y-accesorios-generales", aliases: ["repuestos-y-accesorios-generales"] },
  { slug: "secadora", aliases: ["secadora", "secadoras"] },
  { slug: "terma", aliases: ["terma", "termas"] },
] as const;

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchesAlias(value: string, alias: string) {
  return value === alias || value.startsWith(`${alias}-`) || value.endsWith(`-${alias}`);
}

function matchesFamilyName(value: string, alias: string) {
  return value === alias || value.endsWith(`-${alias}`) || (!alias.endsWith("s") && value.startsWith(`${alias}-`));
}

function familySlugFor(input: ProductImageInput) {
  const slugValue = normalize(input.familySlug);
  if (slugValue) {
    const family = familyPlaceholders.find(({ aliases }) =>
      aliases.some((alias) => slugValue === alias || slugValue.endsWith(`-${alias}`)),
    );
    if (family) return family.slug;
  }

  const nameValue = normalize(input.family);
  if (nameValue) {
    const family = familyPlaceholders.find(({ aliases }) =>
      aliases.some((alias) => matchesFamilyName(nameValue, alias)),
    );
    if (family) return family.slug;
  }
  return null;
}

function categorySlugFor(input: ProductImageInput) {
  for (const candidate of [input.categorySlug, input.category]) {
    const value = normalize(candidate);
    if (!value) continue;
    const category =
      categoryImageAliases.find(({ aliases }) => aliases.some((alias) => alias === value)) ??
      categoryImageAliases.find(({ aliases }) => aliases.some((alias) => matchesAlias(value, alias)));
    if (category) return category.slug;
  }
  return null;
}

function familyCategoryIsCompatible(input: ProductImageInput) {
  const categories = [input.categorySlug, input.category]
    .map(normalize)
    .filter(Boolean);
  if (!categories.length || categories.some((category) => noCategoryAliases.has(category))) return true;
  return categories.some((category) =>
    compatibleFamilyCategoryAliases.some((alias) => matchesAlias(category, alias)),
  );
}

function isFallbackAsset(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("product-placeholder") ||
    normalized.includes("category-placeholder") ||
    normalized.includes("/products/placeholder-") ||
    normalized.includes("/families/") ||
    normalized.includes("/categories/")
  );
}

function publishedImages(images: ProductImageInput["images"]) {
  return [
    ...new Set(
      (images ?? [])
        .filter((image): image is string => typeof image === "string")
        .map((image) => image.trim())
        .filter((image) => image.length > 0 && !isFallbackAsset(image)),
    ),
  ];
}

export function resolveProductImage(input: ProductImageInput): ProductImageResolution {
  const mediaImages = publishedImages(input.images);
  if (mediaImages.length > 0) {
    return { src: mediaImages[0], images: mediaImages, isReference: false, source: "media" };
  }

  const familySlug = familySlugFor(input);
  if (familySlug && (universalFamilyPlaceholders.has(familySlug) || familyCategoryIsCompatible(input))) {
    const src = `/images/products/placeholder-${familySlug}.webp`;
    return { src, images: [src], isReference: true, source: "family" };
  }

  const categorySlug = categorySlugFor(input);
  if (categorySlug) {
    const src = `/images/categories/${categorySlug}.webp`;
    return { src, images: [src], isReference: true, source: "category" };
  }

  return {
    src: GENERIC_PRODUCT_IMAGE,
    images: [GENERIC_PRODUCT_IMAGE],
    isReference: true,
    source: "generic",
  };
}
