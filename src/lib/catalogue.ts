import { nomaWebOrigin, supabase } from './supabase';
import type { Product, ProductVariant } from './types';

export const normalizeWebOrigin = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const resolveImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return '';
  const trimmed = imageUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const origin = normalizeWebOrigin(nomaWebOrigin);
  if (!origin) return '';
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
};

const mapProduct = (row: any): Product => {
  const specJson = row.specifications ?? {};
  const features = Array.isArray(specJson.features) ? specJson.features.filter((value: unknown) => typeof value === 'string') as string[] : [];
  const specs = Object.entries(specJson || {}).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string') acc[key] = value;
    else if (typeof value === 'number' || typeof value === 'boolean') acc[key] = String(value);
    return acc;
  }, {});

  const activeVariants: ProductVariant[] = Array.isArray(row.product_variants)
    ? row.product_variants
        .filter((variant: any) => variant.is_active)
        .map((variant: any) => ({
          id: variant.id,
          name: variant.name,
          color: variant.color,
          sku: variant.sku,
          stock_quantity: Number(variant.stock_quantity ?? 0),
          is_active: !!variant.is_active,
          product_id: row.id,
        }))
    : [];

  const images: string[] = Array.isArray(row.product_images)
    ? row.product_images
        .sort((a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
        .map((image: any) => resolveImageUrl(image.image_url))
        .filter((imageUrl: string) => imageUrl.length > 0)
    : [];

  const colors = activeVariants;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category || 'Ergonomic',
    price: Number(row.price ?? 0),
    short_description: row.short_description || row.description || '',
    description: row.description || row.short_description || '',
    featured: !!row.featured,
    colors,
    features,
    specs,
    images,
    available: colors.some((variant) => variant.stock_quantity > 0),
    currency: 'NGN',
  };
};

export async function fetchProducts(): Promise<Product[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }

  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*), product_images(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Unable to load the NOMA catalogue: ${error.message}`);
  if (!data) throw new Error('The NOMA catalogue request returned no data.');

  return data.map(mapProduct);
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const products = await fetchProducts();
  const featured = products.filter((product) => product.featured);
  return featured.length ? featured : products;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }

  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*), product_images(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(`Unable to load this chair: ${error.message}`);
  return data ? mapProduct(data) : null;
}
