const legacyCategoryAliases: Record<string, string> = {
  lavadora: "lavadoras",
  licuadora: "licuadoras",
  "bomba-de-agua": "bombas-de-agua",
  cocina: "cocinas",
  "campana-extractora": "campanas-extractoras",
  // The former editorial category was consolidated into the imported taxonomy.
  "repuestos-y-accesorios-generales": "conexiones-y-accesorios",
};

export function resolveCatalogCategorySlug(slug: string) {
  return legacyCategoryAliases[slug] ?? slug;
}
