/** Keep an applied value visible when result-derived facets no longer contain it. */
export function filterOptionsWithSelection(values: readonly string[], selected: string): string[] {
  return [...new Set(selected ? [...values, selected] : values)];
}

/** Families can share a name across categories; retain their independent IDs. */
export function familyFilterOptions(
  families: readonly { id: string; name: string; categoryId: string }[],
  categories: readonly { id: string; name: string }[],
): Array<{ value: string; label: string }> {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  return families.map((family) => ({
    value: family.id,
    label: `${family.name} · ${categoryNames.get(family.categoryId) ?? `Categoría ${family.categoryId}`}`,
  }));
}
