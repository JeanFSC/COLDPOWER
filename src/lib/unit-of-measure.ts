const UNIT_OF_MEASURE_LABELS: Record<string, string> = {
  BX: "Caja",
  CJA: "Caja",
  CJ: "Caja",
  DZN: "Docena",
  DOC: "Docena",
  G: "Gramo",
  GLL: "Galón",
  GRM: "Gramo",
  JGO: "Juego",
  KGM: "Kilogramo",
  KG: "Kilogramo",
  L: "Litro",
  LTR: "Litro",
  M: "Metro",
  MLT: "Mililitro",
  MTR: "Metro",
  NIU: "Unidad",
  PAR: "Par",
  PZA: "Pieza",
  SET: "Juego",
  TNE: "Tonelada",
  UN: "Unidad",
  UND: "Unidad",
  UNIDAD: "Unidad",
  "UNIDAD (BIENES)": "Unidad",
};

export function formatUnitOfMeasure(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, " ");
  return UNIT_OF_MEASURE_LABELS[normalized] ?? value.trim();
}

export { UNIT_OF_MEASURE_LABELS };
