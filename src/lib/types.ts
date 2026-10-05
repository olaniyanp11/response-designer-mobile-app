export type ProductVariant = {
  id: string;
  name: string;
  color: string;
  sku: string;
  stock_quantity: number;
  is_active: boolean;
  product_id?: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  short_description: string;
  description: string;
  featured: boolean;
  colors: ProductVariant[];
  features: string[];
  specs: Record<string, string>;
  images: string[];
  available: boolean;
  currency: string;
};

export type CartItem = {
  id?: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  color: string;
  quantity: number;
  stockQuantity: number;
};
