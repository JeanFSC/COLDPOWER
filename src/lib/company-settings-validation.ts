export type CompanySettingsInput = {
  legalName: string | null;
  tradeName: string | null;
  commercialName: string | null;
  ruc: string | null;
  country: string | null;
  department: string | null;
  province: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  phones: string[] | null;
  whatsapp: string | null;
  email: string | null;
  salesEmail: string | null;
  hours: string | null;
  businessHours: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  website: string | null;
  socials: Record<string, string> | null;
  locations: Array<{ name: string; address?: string }> | null;
  paymentMethods: string[] | null;
  guaranteeTerms: string | null;
  coverage: string | null;
  legalLinks: Record<string, string> | null;
};

const MAX_TEXT = 2_000;
const MAX_LIST_ITEMS = 30;

function optionalText(value: unknown, field: string, max = MAX_TEXT): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${field} debe ser texto.`);
  const clean = value.trim();
  if (clean.length > max) throw new Error(`${field} supera el máximo permitido.`);
  return clean || null;
}

function textList(value: unknown, field: string): string[] | null {
  if (value === undefined || value === null || value === "") return null;
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) throw new Error(`${field} debe ser una lista válida.`);
  const result = value.map((item) => optionalText(item, field, 240)).filter((item): item is string => Boolean(item));
  return result.length ? result : null;
}

function textMap(value: unknown, field: string): Record<string, string> | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} debe ser un objeto de enlaces.`);
  const entries = Object.entries(value);
  if (entries.length > MAX_LIST_ITEMS) throw new Error(`${field} tiene demasiados elementos.`);
  const result = Object.fromEntries(entries.map(([key, item]) => {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(key)) throw new Error(`${field} tiene una clave inválida.`);
    if (/(secret|token|password|private|credential|api.?key)/i.test(key)) throw new Error(`${field} no puede contener secretos ni credenciales.`);
    const clean = optionalText(item, `${field}.${key}`, 500);
    if (clean) safeUrl(clean, `${field}.${key}`);
    return [key, clean];
  }).filter(([, item]) => Boolean(item))) as Record<string, string>;
  return Object.keys(result).length ? result : null;
}

function safeUrl(value: string, field: string) {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error(`${field} debe ser una URL válida.`); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`${field} solo admite URLs HTTP o HTTPS.`);
  return value;
}

function locationsList(value: unknown): Array<{ name: string; address?: string }> | null {
  if (value === undefined || value === null || value === "") return null;
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) throw new Error("locations debe ser una lista válida.");
  const result = value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Cada local debe ser un objeto.");
    const row = item as Record<string, unknown>;
    const name = optionalText(row.name, "locations.name", 180);
    if (!name) throw new Error("Cada local necesita nombre.");
    const address = optionalText(row.address, "locations.address", 500);
    return address ? { name, address } : { name };
  });
  return result.length ? result : null;
}

export function validateCompanySettingsInput(body: unknown): CompanySettingsInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Configuración empresarial inválida.");
  const value = body as Record<string, unknown>;
  const email = optionalText(value.email, "email", 240);
  const salesEmail = optionalText(value.salesEmail, "salesEmail", 240);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error("email no tiene un formato válido.");
  if (salesEmail && !/^\S+@\S+\.\S+$/.test(salesEmail)) throw new Error("salesEmail no tiene un formato válido.");
  const country = optionalText(value.country, "country", 120);
  const ruc = optionalText(value.ruc, "ruc", 40);
  if (ruc && /^(PE|PERU|PERÚ|PERUVIAN)$/i.test(country ?? "") && !/^\d{11}$/.test(ruc)) throw new Error("ruc debe contener 11 dígitos para Perú.");
  for (const [field, candidate] of [["facebook", value.facebook], ["instagram", value.instagram], ["tiktok", value.tiktok], ["website", value.website]] as const) { const clean = optionalText(candidate, field, 500); if (clean) safeUrl(clean, field); }
  const seenLocations = new Set<string>();
  if (Array.isArray(value.locations)) for (const location of value.locations) { const name = location && typeof location === "object" && !Array.isArray(location) ? (location as Record<string, unknown>).name : null; if (typeof name === "string") { const key = name.trim().toLocaleLowerCase(); if (seenLocations.has(key)) throw new Error("locations no puede contener nombres duplicados."); seenLocations.add(key); } }
  return {
    legalName: optionalText(value.legalName, "legalName"), tradeName: optionalText(value.tradeName, "tradeName"), commercialName: optionalText(value.commercialName, "commercialName"),
    ruc, country, department: optionalText(value.department, "department", 120), province: optionalText(value.province, "province", 120), district: optionalText(value.district, "district", 120), address: optionalText(value.address, "address"), phone: optionalText(value.phone, "phone", 40), phones: textList(value.phones, "phones"),
    whatsapp: optionalText(value.whatsapp, "whatsapp", 40), email, salesEmail, hours: optionalText(value.hours, "hours"), businessHours: optionalText(value.businessHours, "businessHours"), facebook: optionalText(value.facebook, "facebook", 500), instagram: optionalText(value.instagram, "instagram", 500), tiktok: optionalText(value.tiktok, "tiktok", 500), website: optionalText(value.website, "website", 500),
    socials: textMap(value.socials, "socials"), locations: locationsList(value.locations), paymentMethods: textList(value.paymentMethods, "paymentMethods"),
    guaranteeTerms: optionalText(value.guaranteeTerms, "guaranteeTerms"), coverage: optionalText(value.coverage, "coverage"), legalLinks: textMap(value.legalLinks, "legalLinks"),
  };
}
