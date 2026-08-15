import type { Product } from "@/types/product";

export type CompatibilityState =
  | "confirmed"
  | "specification-match"
  | "validation-required"
  | "not-compatible";

export type CompatibilityEvaluation = {
  state: CompatibilityState;
  label: string;
  reason: string;
};

const labels: Record<CompatibilityState, string> = {
  confirmed: "Compatibilidad confirmada",
  "specification-match": "Coincidencia por especificaciones",
  "validation-required": "Validación requerida",
  "not-compatible": "No compatible",
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");
}

export function evaluateCompatibility(product: Product, equipmentModel = ""): CompatibilityEvaluation {
  const model = equipmentModel.trim();
  const normalizedModel = normalize(model);
  const compatibilityText = product.compatibility.join(" ");
  const normalizedCompatibility = normalize(compatibilityText);

  if (/no compatible|incompatible|no aplica/i.test(compatibilityText)) {
    return {
      state: "not-compatible",
      label: labels["not-compatible"],
      reason: "La referencia registrada no declara compatibilidad con esta aplicación.",
    };
  }

  if (normalizedModel && normalizedCompatibility.includes(normalizedModel)) {
    return {
      state: "confirmed",
      label: labels.confirmed,
      reason: "El modelo consultado coincide con una relación de compatibilidad registrada.",
    };
  }

  return {
    state: "validation-required",
    label: labels["validation-required"],
    reason: model
      ? "Los datos disponibles no son suficientes para confirmar la aplicación automáticamente."
      : "Ingresa el modelo del equipo para iniciar la validación técnica.",
  };
}
