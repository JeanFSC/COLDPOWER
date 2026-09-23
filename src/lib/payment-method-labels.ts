type PaymentSettings = { paymentMethods?: string[] | null };

export function getPublicPaymentMethodLabels(settings: PaymentSettings, labels: Record<string, string>) {
  const seen = new Set<string>();

  return (settings.paymentMethods ?? [])
    .map((method) => {
      const key = method.trim().toUpperCase();
      if (!key) return "";
      return labels[key] ?? key.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
    })
    .filter((label) => {
      if (!label || seen.has(label)) return false;
      seen.add(label);
      return true;
    });
}
