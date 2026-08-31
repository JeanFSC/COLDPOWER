import XLSX from "xlsx";

export const IMPORT_SHEET = "IMPORT_PRODUCTOS";

export const SOURCE_FIELDS = [
  "sku",
  "nombre_original",
  "nombre_normalizado",
  "categoria",
  "familia",
  "producto",
  "marca",
  "compatibilidad_marcas",
  "modelo_codigo",
  "aplicacion",
  "voltaje",
  "potencia",
  "frecuencia",
  "rpm",
  "amperaje",
  "capacitancia",
  "refrigerante",
  "potencia_hp",
  "temperatura",
  "medidas",
  "longitud",
  "conexion_medida",
  "unidad_medida",
  "estado",
  "impuesto",
  "codigo_referencia_original",
  "codigo_barra_original",
  "peso_original",
  "requiere_revision",
  "motivo_revision",
  "posible_duplicado",
  "grupo_duplicado",
  "confianza_normalizacion",
  "metodo_clasificacion",
  "pagina_fuente",
  "fila_pagina",
];

export function readImportRows(workbookPath) {
  const workbook = XLSX.readFile(workbookPath, { cellDates: false, raw: false });
  const worksheet = workbook.Sheets[IMPORT_SHEET];

  if (!worksheet) {
    throw new Error(`No existe la hoja maestra ${IMPORT_SHEET}.`);
  }

  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    raw: false,
  });
  const headers = (matrix[0] ?? []).map((value) => cleanText(value));
  const missingHeaders = SOURCE_FIELDS.filter((field) => !headers.includes(field));

  if (missingHeaders.length > 0) {
    throw new Error(`Faltan columnas obligatorias: ${missingHeaders.join(", ")}`);
  }

  const rows = matrix
    .slice(1)
    .filter((row) => row.some((value) => cleanText(value) !== null))
    .map((row) => normalizeSourceRow(Object.fromEntries(headers.map((header, index) => [header, row[index]]))));

  return { rows, sheetName: IMPORT_SHEET, headers };
}

export function normalizeSourceRow(row) {
  const normalized = {};

  for (const field of SOURCE_FIELDS) {
    if (field === "requiere_revision" || field === "posible_duplicado") {
      normalized[field] = parseNullableBoolean(row[field]);
      continue;
    }

    normalized[field] = cleanText(row[field]);
  }

  return normalized;
}

export function validateImportRows(rows, expectedCount = 1348) {
  const errors = [];
  const counts = new Map();

  for (const [index, row] of rows.entries()) {
    const sku = cleanText(row.sku);
    if (!sku) {
      errors.push(`Fila ${index + 2}: SKU vacío.`);
      continue;
    }
    counts.set(sku, (counts.get(sku) ?? 0) + 1);
  }

  const duplicateSkus = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([sku]) => sku)
    .sort((a, b) => a.localeCompare(b));

  if (duplicateSkus.length > 0) {
    errors.push(`SKUs duplicados: ${duplicateSkus.join(", ")}.`);
  }

  if (rows.length !== expectedCount) {
    errors.push(`Se esperaban ${expectedCount} productos y se encontraron ${rows.length}.`);
  }

  return { valid: errors.length === 0, errors, duplicateSkus };
}

export function planProductSlugs(rows, existingSlugsBySku = new Map()) {
  const planned = new Map(existingSlugsBySku);
  const occupied = new Set([...planned.values()].filter(Boolean));
  const candidates = rows
    .map((row) => ({
      sku: cleanText(row?.sku),
      baseSlug: slugify(row?.nombre_normalizado) || "producto",
    }))
    .filter((row) => row.sku && !planned.has(row.sku))
    .sort((left, right) => {
      if (left.baseSlug !== right.baseSlug) return left.baseSlug < right.baseSlug ? -1 : 1;
      return left.sku === right.sku ? 0 : left.sku < right.sku ? -1 : 1;
    });

  for (const { sku, baseSlug } of candidates) {
    const slug = resolveProductSlug(baseSlug, sku, occupied);
    planned.set(sku, slug);
    occupied.add(slug);
  }

  return planned;
}

function resolveProductSlug(baseSlug, sku, occupied) {
  if (!occupied.has(baseSlug)) return baseSlug;

  const skuPart = slugify(sku) || "sin-sku";
  let candidate = `${baseSlug}-${skuPart}`;
  if (!occupied.has(candidate)) return candidate;

  const hash = stableSkuHash(sku);
  let sequence = 1;
  while (occupied.has(candidate)) {
    candidate = `${baseSlug}-${skuPart}-${hash}${sequence === 1 ? "" : `-${sequence}`}`;
    sequence += 1;
  }
  return candidate;
}

function stableSkuHash(value) {
  let hash = 5381;
  for (const character of String(value)) {
    hash = (hash * 33) ^ character.codePointAt(0);
  }
  return (hash >>> 0).toString(36);
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function parseNullableBoolean(value) {
  const text = cleanText(value)?.toLowerCase();
  if (!text) return null;
  if (["si", "sí", "yes", "true", "1"].includes(text)) return true;
  if (["no", "false", "0"].includes(text)) return false;
  return null;
}
