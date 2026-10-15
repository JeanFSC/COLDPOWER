type SearchableNode = { name: string; slug: string };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es");
}

export function taxonomyNodeMatches(node: SearchableNode, query: string) {
  const term = normalize(query);
  return !term || normalize(node.name).includes(term) || normalize(node.slug).includes(term);
}

/** Keep all children for a category match; otherwise show only matching families. */
export function taxonomySearchChildren<T extends SearchableNode>(category: SearchableNode, children: T[], query: string): T[] {
  return taxonomyNodeMatches(category, query) ? children : children.filter(child => taxonomyNodeMatches(child, query));
}
