import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchProducts } from '../../lib/catalogue';
import type { Product } from '../../lib/types';
import { ProductCard } from '../../components/ProductCard';
import { useCart } from '../../contexts/CartContext';
import { requireSignIn } from '../../lib/requireSignIn';

export default function ShopScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const items = await fetchProducts();
        if (isMounted) setProducts(items);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Unable to load catalogue');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;

    return products.filter((product) => {
      const haystack = [
        product.name,
        product.category,
        product.short_description,
        product.description,
        product.features.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [products, query]);

  const handleQuickAdd = async (product: Product) => {
    const variant = product.colors.find((item) => item.is_active && item.stock_quantity > 0) ?? product.colors[0];
    if (!variant) return;
    try {
      if (!(await requireSignIn('/(tabs)/shop'))) return;
      await addItem(product, variant, 1);
    } catch (err) {
      Alert.alert('Could not add this chair', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Collection</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search chairs, categories, features"
        style={styles.search}
        placeholderTextColor="#6e7a73"
      />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#1e3d33" /></View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : filtered.length ? (
        filtered.map((product) => (
          <ProductCard key={product.id} product={product} onQuickAdd={handleQuickAdd} />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No chairs match this search.</Text>
          <Pressable onPress={() => setQuery('')} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear search</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f3ee' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: '800', color: '#1c2d29', marginBottom: 14 },
  search: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4dac7',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1c2d29',
    marginBottom: 18,
  },
  centered: { paddingVertical: 30, alignItems: 'center' },
  error: { color: '#b13d3d', fontSize: 15, marginTop: 8 },
  emptyState: { paddingTop: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#21352d', marginBottom: 12 },
  clearButton: { backgroundColor: '#1e3d33', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  clearText: { color: '#fff', fontWeight: '700' },
});
