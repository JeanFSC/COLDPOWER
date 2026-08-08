export type ProductStatus = "in-stock" | "low-stock" | "on-request" | "out-of-stock";

export type ProductCategory =
  | "compresores"
  | "aires-acondicionados"
  | "refrigeracion-industrial"
  | "condensadores-y-evaporadores"
  | "termostatos-y-controles"
  | "ventiladores-y-motores"
  | "valvulas-de-expansion"
  | "filtros-y-secadores"
  | "refrigerantes-y-gases"
  | "repuestos-linea-blanca"
  | "tuberias-y-accesorios"
  | "herramientas-de-refrigeracion";

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
  price: number;
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
