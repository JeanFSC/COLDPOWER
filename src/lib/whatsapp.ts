export type WhatsAppLinkInput = {
  phone: string;
  message?: string;
  productName?: string;
  sku?: string;
  url?: string;
};

export function createWhatsAppLink({ phone, message, productName, sku, url }: WhatsAppLinkInput) {
  const phoneNumber = phone.replace(/\D/g, "");
  const defaultMessage = [
    "Hola ColdPower, deseo cotizar este equipo o repuesto.",
    productName ? `Producto: ${productName}` : undefined,
    sku ? `SKU: ${sku}` : undefined,
    url ? `URL: ${url}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message ?? defaultMessage)}`;
}
