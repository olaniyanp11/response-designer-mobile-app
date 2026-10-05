import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchFeaturedProducts } from '../../lib/catalogue';
import type { Product } from '../../lib/types';
import { ProductCard } from '../../components/ProductCard';
import { useCart } from '../../contexts/CartContext';
import { requireSignIn } from '../../lib/requireSignIn';

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const items = await fetchFeaturedProducts();
        if (isMounted) setProducts(items);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Unable to load featured chairs');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleQuickAdd = async (product: Product) => {
    const variant = product.colors.find((item) => item.is_active && item.stock_quantity > 0) ?? product.colors[0];
    if (!variant) return;
    try {
      if (!(await requireSignIn('/(tabs)'))) return;
      await addItem(product, variant, 1);
    } catch (err) {
      Alert.alert('Could not add this chair', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.dash}>NOMA</Text>
      <Text style={styles.title}>Thoughtful seating for focused work.</Text>
      <Text style={styles.subtitle}>Browse ergonomic chairs built for everyday comfort, quiet focus, and long hours.</Text>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#1e3d33" /></View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : products.length ? (
        products.map((product) => (
          <ProductCard key={product.id} product={product} onQuickAdd={handleQuickAdd} />
        ))
      ) : (
        <Text style={styles.empty}>No chairs are available right now.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f3ee' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  dash: { fontSize: 32, letterSpacing: 4, fontWeight: '800', color: '#1c2d29', marginBottom: 8 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#1b2a25', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#586b61', lineHeight: 24, marginBottom: 24 },
  centered: { paddingVertical: 30, alignItems: 'center' },
  error: { color: '#b13d3d', fontSize: 15, marginTop: 8 },
  empty: { color: '#21352d', fontSize: 16, marginTop: 8 },
});
