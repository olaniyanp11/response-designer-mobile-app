import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { resolveImageUrl } from '../lib/catalogue';
import { supabase, supabaseConfigError } from '../lib/supabase';
import type { CartItem, Product, ProductVariant } from '../lib/types';

const GUEST_CART_KEY = 'noma-cart-v1';
const GUEST_CART_MERGE_KEY = 'noma-cart-merge-v1';
const MAX_CART_QUANTITY = 20;

type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  initialized: boolean;
  isGuestCart: boolean;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => Promise<void>;
  updateItemQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clear: () => Promise<void>;
  mergeGuestCartIntoAuth: () => Promise<void>;
};

type MergePlan = {
  userId: string;
  guestCart: string;
  lines: { product_id: string; variant_id: string; quantity: number }[];
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const readGuestCart = async (): Promise<CartItem[]> => {
  const raw = await AsyncStorage.getItem(GUEST_CART_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const maximumQuantity = (stockQuantity: number) =>
  Math.max(0, Math.min(MAX_CART_QUANTITY, Math.floor(Number(stockQuantity) || 0)));

const requireSupabase = () => {
  if (!supabase) throw new Error(supabaseConfigError ?? 'Supabase is not configured.');
  return supabase;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isGuestCart, setIsGuestCart] = useState(true);

  const syncGuestItems = useCallback(async () => {
    const guestItems = await readGuestCart();
    setItems(guestItems);
    setIsGuestCart(true);
    setInitialized(true);
  }, []);

  const syncAuthItems = useCallback(async (userId: string): Promise<CartItem[]> => {
    const client = requireSupabase();
    const { data: cartData, error: cartError } = await client
      .from('carts')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (cartError) throw new Error(`Unable to load the saved cart: ${cartError.message}`);
    if (!cartData) throw new Error('Unable to load the saved cart: no cart was returned.');

    const { data: cartRows, error: rowsError } = await client
      .from('cart_items')
      .select('*, products(*, product_images(*)), product_variants(*)')
      .eq('cart_id', cartData.id);

    if (rowsError) throw new Error(`Unable to reload the saved cart: ${rowsError.message}`);

    const mapped = (cartRows ?? []).map((row: any) => {
      const product = row.products ?? {};
      const variant = row.product_variants ?? {};
      const images = Array.isArray(product.product_images) ? [...product.product_images] : [];
      images.sort((left: { sort_order?: number }, right: { sort_order?: number }) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0));
      return {
        id: row.id,
        productId: row.product_id,
        variantId: row.variant_id,
        slug: product.slug || '',
        name: product.name || 'Chair',
        price: Number(product.price ?? 0),
        image: resolveImageUrl(images[0]?.image_url),
        color: variant.name || 'Default',
        quantity: Number(row.quantity ?? 0),
        stockQuantity: Number(variant.stock_quantity ?? 0),
      } satisfies CartItem;
    });

    setItems(mapped);
    setIsGuestCart(false);
    setInitialized(true);
    return mapped;
  }, []);

  const mergeTask = useRef<Promise<void> | null>(null);

  const mergeGuestCartIntoAuth = useCallback(async () => {
    if (mergeTask.current) return mergeTask.current;

    const task = mergeGuestCart().finally(() => {
      mergeTask.current = null;
    });
    mergeTask.current = task;
    return task;

    async function mergeGuestCart() {
    const client = requireSupabase();
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(`Unable to restore the signed-in session: ${sessionError.message}`);
    if (!session?.user) throw new Error('Sign in before merging the guest cart.');

    const guestItems = await readGuestCart();
    if (!guestItems.length) {
      await syncAuthItems(session.user.id);
      await AsyncStorage.removeItem(GUEST_CART_MERGE_KEY);
      return;
    }

    const guestCart = JSON.stringify(guestItems);
    let plan: MergePlan | null = null;
    const savedPlan = await AsyncStorage.getItem(GUEST_CART_MERGE_KEY);
    if (savedPlan) {
      try {
        const parsed = JSON.parse(savedPlan) as MergePlan;
        if (parsed.userId === session.user.id && parsed.guestCart === guestCart) plan = parsed;
      } catch {
        plan = null;
      }
    }

    const { data: cartData, error: cartError } = await client
      .from('carts')
      .upsert({ user_id: session.user.id }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();
    if (cartError) throw new Error(`Unable to prepare the saved cart: ${cartError.message}`);
    if (!cartData) throw new Error('Unable to prepare the saved cart: no cart was returned.');

    if (!plan) {
      const { data: existingRows, error: existingError } = await client
        .from('cart_items')
        .select('product_id, variant_id, quantity')
        .eq('cart_id', cartData.id);
      if (existingError) throw new Error(`Unable to read the saved cart: ${existingError.message}`);

      const existingByVariant = new Map((existingRows ?? []).map((row: any) => [row.variant_id, row]));
      const lines = new Map<string, MergePlan['lines'][number]>();
      for (const guestItem of guestItems) {
        const existing = existingByVariant.get(guestItem.variantId);
        const existingQuantity = Number(existing?.quantity ?? 0);
        const combinedQuantity = existingQuantity + Math.max(1, Math.floor(guestItem.quantity));
        const allowedQuantity = maximumQuantity(guestItem.stockQuantity);
        if (!allowedQuantity) {
          throw new Error(`${guestItem.name} (${guestItem.color}) is sold out. Your guest cart has been preserved.`);
        }
        lines.set(guestItem.variantId, {
          product_id: guestItem.productId,
          variant_id: guestItem.variantId,
          quantity: Math.min(combinedQuantity, allowedQuantity),
        });
      }
      plan = { userId: session.user.id, guestCart, lines: [...lines.values()] };
      await AsyncStorage.setItem(GUEST_CART_MERGE_KEY, JSON.stringify(plan));
    }

    const { error: mergeError } = await client
      .from('cart_items')
      .upsert(plan.lines.map((line) => ({ cart_id: cartData.id, ...line })), {
        onConflict: 'cart_id,variant_id',
      });
    if (mergeError) throw new Error(`Unable to merge the guest cart: ${mergeError.message}`);

    const reloadedItems = await syncAuthItems(session.user.id);
    const reloadedByVariant = new Map(reloadedItems.map((item) => [item.variantId, item]));
    for (const line of plan.lines) {
      if ((reloadedByVariant.get(line.variant_id)?.quantity ?? 0) < line.quantity) {
        throw new Error('The saved cart did not contain all guest items after merging. Your guest cart has been preserved.');
      }
    }

    await AsyncStorage.removeItem(GUEST_CART_KEY);
    await AsyncStorage.removeItem(GUEST_CART_MERGE_KEY);
    }
  }, [syncAuthItems]);

  useEffect(() => {
    let isCancelled = false;
    const client = supabase;
    const subscription = client?.auth.onAuthStateChange((event, session) => {
      if (isCancelled || event === 'INITIAL_SESSION') return;
      const sync = session?.user
        ? event === 'SIGNED_IN'
          ? mergeGuestCartIntoAuth()
          : syncAuthItems(session.user.id)
        : syncGuestItems();
      void sync.catch((error: unknown) => {
        console.error('Unable to synchronize the cart after an auth change.', error);
      });
    }).data.subscription;

    const initialize = async () => {
      if (!client) {
        await syncGuestItems();
        return;
      }
      const { data: { session }, error } = await client.auth.getSession();
      if (error) throw new Error(`Unable to restore the session: ${error.message}`);
      if (isCancelled) return;
      if (session?.user) await mergeGuestCartIntoAuth();
      else await syncGuestItems();
    };

    void initialize().catch((error: unknown) => {
      console.error('Unable to initialize the cart.', error);
      if (!isCancelled) setInitialized(true);
    });

    return () => {
      isCancelled = true;
      subscription?.unsubscribe();
    };
  }, [mergeGuestCartIntoAuth, syncAuthItems, syncGuestItems]);

  const requireSignedInUserId = useCallback(async () => {
    const client = requireSupabase();
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(`Unable to check your session: ${sessionError.message}`);
    if (!session?.user) throw new Error('Sign in to change your cart.');
    return session.user.id;
  }, []);

  const addItem = useCallback(async (product: Product, variant: ProductVariant, quantity = 1) => {
    const allowedQuantity = maximumQuantity(variant.stock_quantity);
    if (!variant.is_active || allowedQuantity === 0) {
      throw new Error(`${product.name} (${variant.name}) is sold out.`);
    }
    const requestedQuantity = Math.floor(quantity);
    if (requestedQuantity < 1) throw new Error('Choose a quantity of at least one.');

    const existing = items.find((item) => item.variantId === variant.id);
    const totalQuantity = (existing?.quantity ?? 0) + requestedQuantity;
    if (totalQuantity > allowedQuantity) {
      throw new Error(`Only ${allowedQuantity} unit(s) of ${variant.name} are currently available.`);
    }

    const userId = await requireSignedInUserId();
    const client = requireSupabase();
    const { data: cartData, error: cartError } = await client
      .from('carts')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();
    if (cartError) throw new Error(`Unable to save your cart: ${cartError.message}`);
    if (!cartData) throw new Error('Unable to save your cart.');

    const { error: saveError } = await client.from('cart_items').upsert(
      {
        cart_id: cartData.id,
        product_id: product.id,
        variant_id: variant.id,
        quantity: totalQuantity,
      },
      { onConflict: 'cart_id,variant_id' }
    );
    if (saveError) throw new Error(`Unable to save this item: ${saveError.message}`);
    await syncAuthItems(userId);
  }, [items, requireSignedInUserId, syncAuthItems]);

  const updateItemQuantity = useCallback(async (variantId: string, quantity: number) => {
    const target = items.find((item) => item.variantId === variantId);
    if (!target) return;
    const nextQuantity = Math.min(maximumQuantity(target.stockQuantity), Math.max(0, Math.floor(quantity)));

    const userId = await requireSignedInUserId();
    const client = requireSupabase();
    const { data: cartData, error: cartError } = await client
      .from('carts')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();
    if (cartError) throw new Error(`Unable to update your cart: ${cartError.message}`);
    if (!cartData) throw new Error('Unable to update your cart.');
    const result = nextQuantity <= 0
      ? await client.from('cart_items').delete().eq('cart_id', cartData.id).eq('variant_id', variantId)
      : await client.from('cart_items').update({ quantity: nextQuantity }).eq('cart_id', cartData.id).eq('variant_id', variantId);
    if (result.error) throw new Error(`Unable to update this item: ${result.error.message}`);
    await syncAuthItems(userId);
  }, [items, requireSignedInUserId, syncAuthItems]);

  const removeItem = useCallback(async (variantId: string) => {
    const userId = await requireSignedInUserId();
    const client = requireSupabase();
    const { data: cartData, error: cartError } = await client
      .from('carts')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();
    if (cartError) throw new Error(`Unable to update your cart: ${cartError.message}`);
    if (!cartData) throw new Error('Unable to update your cart.');
    const { error } = await client.from('cart_items').delete().eq('cart_id', cartData.id).eq('variant_id', variantId);
    if (error) throw new Error(`Unable to remove this item: ${error.message}`);
    await syncAuthItems(userId);
  }, [requireSignedInUserId, syncAuthItems]);

  const clear = useCallback(async () => {
    const userId = await requireSignedInUserId();
    const client = requireSupabase();
    const { data: cartData, error: cartError } = await client
      .from('carts')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();
    if (cartError) throw new Error(`Unable to clear your cart: ${cartError.message}`);
    if (!cartData) throw new Error('Unable to clear your cart.');
    const { error } = await client.from('cart_items').delete().eq('cart_id', cartData.id);
    if (error) throw new Error(`Unable to clear your cart: ${error.message}`);
    await syncAuthItems(userId);
  }, [requireSignedInUserId, syncAuthItems]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(() => ({
    items,
    subtotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    initialized,
    isGuestCart,
    addItem,
    updateItemQuantity,
    removeItem,
    clear,
    mergeGuestCartIntoAuth,
  }), [addItem, clear, initialized, isGuestCart, items, mergeGuestCartIntoAuth, removeItem, subtotal, updateItemQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

export const readCartSnapshot = async () => readGuestCart();
