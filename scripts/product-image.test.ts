import assert from "node:assert/strict";
import test from "node:test";
import { GENERIC_PRODUCT_IMAGE, resolveProductImage } from "../src/lib/product-image";

test("resuelve placeholders por familia y nunca cae en el compresor fijo", () => {
  const cases = [
    ["capacitor", "capacitores"],
    ["tarjeta electrónica", "tarjetas-electronicas"],
    ["ventilador 12 V", "motores-ventiladores"],
    ["compresor hermético", "compresores"],
  ] as const;

  for (const [family, expectedSlug] of cases) {
    const result = resolveProductImage({ family, category: "Refrigeración" });
    assert.equal(result.src, `/images/products/placeholder-${expectedSlug}.webp`);
    assert.equal(result.source, "family");
    assert.equal(result.isReference, true);
  }
});

test("acepta las familias reales de la taxonomía", () => {
  assert.equal(resolveProductImage({ family: "Ventiladores" }).src, "/images/products/placeholder-motores-ventiladores.webp");
  assert.equal(resolveProductImage({ family: "Motocompresores" }).src, "/images/products/placeholder-compresores.webp");
  assert.equal(resolveProductImage({ family: "Controladores de temperatura" }).src, "/images/products/placeholder-termostatos-controles.webp");
  assert.equal(resolveProductImage({ family: "Temporizadores" }).src, "/images/products/placeholder-timers-sensores.webp");
});

test("normaliza categorías reales hacia los assets de categoría existentes", () => {
  assert.equal(resolveProductImage({ category: "Campanas extractoras" }).src, "/images/categories/campana-extractora.webp");
  assert.equal(resolveProductImage({ category: "Lavadoras" }).src, "/images/categories/lavadora.webp");
});

test("no cruza placeholders HVAC hacia familias de otros dominios", () => {
  assert.equal(resolveProductImage({ family: "Filtros", category: "Campanas extractoras" }).src, "/images/categories/campana-extractora.webp");
  assert.equal(resolveProductImage({ family: "Filtros", category: "Lavadoras" }).src, "/images/categories/lavadora.webp");
  assert.equal(
    resolveProductImage({
      family: "Filtros",
      familySlug: "campanas-extractoras-filtros",
      category: "Campanas extractoras",
      categorySlug: "campanas-extractoras",
    }).src,
    "/images/categories/campana-extractora.webp",
  );
  assert.equal(
    resolveProductImage({
      family: "Filtros",
      familySlug: "lavadoras-filtros",
      category: "Lavadoras",
      categorySlug: "lavadoras",
    }).src,
    "/images/categories/lavadora.webp",
  );
  assert.equal(
    resolveProductImage({
      family: "Filtros",
      familySlug: "refrigeracion-filtros",
      category: "Refrigeraci\u00f3n",
      categorySlug: "refrigeracion",
    }).src,
    "/images/products/placeholder-valvulas-filtros.webp",
  );
  assert.equal(resolveProductImage({ family: "Filtros", category: "Refrigeración" }).src, "/images/products/placeholder-valvulas-filtros.webp");
  assert.equal(resolveProductImage({ family: "Válvulas", category: "Cocinas" }).src, "/images/categories/cocina.webp");
  assert.equal(resolveProductImage({ family: "Ventiladores", category: "Lavadoras" }).src, "/images/categories/lavadora.webp");
  assert.equal(resolveProductImage({ family: "Refrigerantes", category: "Lavadoras" }).src, "/images/categories/lavadora.webp");
  assert.equal(resolveProductImage({ family: "Motocompresores", category: "Lavadoras" }).src, "/images/categories/lavadora.webp");
});

test("conserva familias visualmente genéricas aunque el dominio sea otro", () => {
  assert.equal(resolveProductImage({ family: "Resistencias", category: "Lavadoras" }).src, "/images/products/placeholder-resistencias.webp");
  assert.equal(resolveProductImage({ family: "Termostatos", category: "Cocinas" }).src, "/images/products/placeholder-termostatos-controles.webp");
  assert.equal(resolveProductImage({ family: "Tarjetas electrónicas", category: "Lavadoras" }).src, "/images/products/placeholder-tarjetas-electronicas.webp");
  assert.equal(resolveProductImage({ family: "Temporizadores", category: "Lavadoras" }).src, "/images/products/placeholder-timers-sensores.webp");
});

test("no interpreta el prefijo de un family slug compuesto como la familia visual", () => {
  assert.equal(resolveProductImage({ family: "Otros", familySlug: "herramientas-y-equipos-otros", category: "Herramientas y equipos" }).src, "/images/categories/herramientas.webp");
  assert.equal(resolveProductImage({ family: "Motores automotrices", familySlug: "automotriz-motores-automotrices", category: "Automotriz" }).src, "/images/categories/motores-automotrices.webp");
});

test("usa una categoría neutra para una familia desconocida y un genérico si tampoco existe categoría", () => {
  const categoryResult = resolveProductImage({ family: "Repuesto desconocido", category: "Refrigeración" });
  assert.equal(categoryResult.src, "/images/categories/refrigeracion.webp");
  assert.equal(categoryResult.source, "category");

  const genericResult = resolveProductImage({ family: "Repuesto desconocido", category: "Categoría desconocida" });
  assert.equal(genericResult.src, GENERIC_PRODUCT_IMAGE);
  assert.equal(genericResult.source, "generic");
});

test("mantiene una imagen neutra para carbones de amoladora sin inventar una familia HVAC", () => {
  const result = resolveProductImage({ family: "Carbones y escobillas", category: "Amoladoras" });
  assert.equal(result.src, GENERIC_PRODUCT_IMAGE);
  assert.equal(result.source, "generic");
  assert.notEqual(result.src, "/images/products/placeholder-compresores.webp");
});

test("prioriza media publicada y descarta fallbacks heredados antes de resolver la familia", () => {
  const mediaResult = resolveProductImage({
    images: ["/api/media/asset-real", "/images/products/product-placeholder.webp"],
    family: "Capacitores",
  });
  assert.equal(mediaResult.src, "/api/media/asset-real");
  assert.equal(mediaResult.isReference, false);

  const staleFallbackResult = resolveProductImage({
    images: ["/images/products/product-placeholder.webp"],
    family: "Capacitores",
  });
  assert.equal(staleFallbackResult.src, "/images/products/placeholder-capacitores.webp");
  assert.equal(staleFallbackResult.source, "family");
});
