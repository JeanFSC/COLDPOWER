export function normalizePeruDocument(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

export function isValidPeruvianDni(value: unknown) {
  return /^\d{8}$/.test(normalizePeruDocument(value));
}

export function isValidPeruvianRuc(value: unknown) {
  const digits = normalizePeruDocument(value);
  if (!/^(10|15|17|20)\d{9}$/.test(digits)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
  const complement = 11 - (sum % 11);
  const expected = complement === 10 ? 0 : complement === 11 ? 1 : complement;
  return expected === Number(digits[10]);
}
