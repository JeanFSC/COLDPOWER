export type ProductStatus = "in-stock" | "low-stock" | "on-request" | "out-of-stock";

export type ProductCategory =
  | "refrigeracion"
  | "repuestos-y-accesorios-generales"
  | "lavadora"
  | "licuadora"
  | "bomba-de-agua"
  | "cocina"
  | "motores-automotrices"
  | "campana-extractora"
  | "secadora"
  | "lustradoras"
  | "otros-electrodomesticos"
  | "terma"
  | "hervidor"
  | "extractor"
  | "plancha"
  | "arrocera";

export type ProductSpec = {
  label: string;
  value: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  brand: string;
  /** `null` significa que el precio todavía no fue cargado: la UI debe mostrar "Cotizar". */
  price: number | null;
  oldPrice?: number;
  discount?: number;
  stock: number;
  sku: string;
  status: ProductStatus;
  type: string;
  origin: string;
  capacity?: string;
  compatibility: string[];
  specs: ProductSpec[];
  images: string[];
  shortDescription: string;
  longDescription: string;
  description: string;
  featured: boolean;
  onSale: boolean;
  relatedIds: string[];
};
