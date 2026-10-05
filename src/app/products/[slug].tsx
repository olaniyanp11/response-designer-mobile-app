import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchProductBySlug } from '../../lib/catalogue';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../lib/types';
import { useCart } from '../../contexts/CartContext';
import { requireSignIn } from '../../lib/requireSignIn';

const priceFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        setError(null);
        const item = await fetchProductBySlug(String(slug));
        if (isMounted) {
          setProduct(item);
          const firstAvailable = item?.colors.find((variant) => variant.is_active && variant.stock_quantity > 0) ?? item?.colors[0];
          setSelectedVariantId(firstAvailable?.id ?? null);
          setQuantity(1);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Unable to load this chair');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();
    return () => { isMounted = false; };
  }, [slug]);

  const selectedVariant = useMemo(() => {
    return product?.colors.find((variant) => variant.id === selectedVariantId) ?? product?.colors[0] ?? null;
  }, [product, selectedVariantId]);

  const imageUrls = product?.images ?? [];
  const maxQuantity = selectedVariant ? Math.min(20, Math.max(0, selectedVariant.stock_quantity)) : 0;
  const canAdd = Boolean(selectedVariant?.is_active && maxQuantity > 0);
  const shownQuantity = canAdd ? Math.min(quantity, maxQuantity) : 0;

  const handleAddToCart = async () => {
    if (!product || !selectedVariant || !canAdd) return;
    try {
      if (!(await requireSignIn(`/products/${product.slug}`))) return;
      await addItem(product, selectedVariant, shownQuantity);
      router.push('/(tabs)/cart');
    } catch (err) {
      Alert.alert('Could not add this chair', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#1e3d33" /></View>;
  }

  if (error || !product) {
    return <View style={styles.loading}><Text style={styles.empty}>{error || 'This chair could not be found.'}</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: imageUrls[0] || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=80' }} style={styles.heroImage} resizeMode="cover" />

      <Text style={styles.category}>{product.category}</Text>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>{priceFormatter.format(product.price)}</Text>

      <Text style={styles.sectionTitle}>Choose a color</Text>
      <View style={styles.swatches}>
        {product.colors.map((variant) => {
          const isSelected = variant.id === selectedVariant?.id;
          const disabled = !variant.is_active || variant.stock_quantity < 1;

          return (
            <Pressable
              key={variant.id}
              onPress={() => {
                if (disabled) return;
                setSelectedVariantId(variant.id);
                setQuantity(1);
              }}
              disabled={disabled}
              style={[styles.swatchButton, isSelected && styles.swatchSelected, disabled && styles.swatchDisabled]}
            >
              <Text style={styles.swatchText}>{variant.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Quantity</Text>
      <View style={styles.quantityRow}>
        <Pressable disabled={!canAdd || shownQuantity <= 1} onPress={() => setQuantity((value) => Math.max(1, value - 1))} style={styles.stepper}>
          <Text style={styles.stepperText}>−</Text>
        </Pressable>
        <Text style={styles.quantityValue}>{shownQuantity}</Text>
        <Pressable
          disabled={!canAdd || shownQuantity >= maxQuantity}
          onPress={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
          style={styles.stepper}
        >
          <Text style={styles.stepperText}>+</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.addButton, !canAdd && styles.addButtonDisabled]} disabled={!canAdd} onPress={handleAddToCart}>
        <Text style={styles.addText}>{canAdd ? 'Add to cart' : 'Sold out'}</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.description}>{product.description}</Text>

      <Text style={styles.sectionTitle}>Features</Text>
      {product.features.map((feature, index) => (
        <Text key={`${index}-${feature}`} style={styles.feature}>• {feature}</Text>
      ))}

      <Text style={styles.sectionTitle}>Specifications</Text>
      {Object.entries(product.specs).map(([label, value]) => (
        <View key={label} style={styles.specRow}>
          <Text style={styles.specLabel}>{label}</Text>
          <Text style={styles.specValue}>{value}</Text>
        </View>
      ))}

      {supabase && (
        <Text style={styles.notice}>Live catalog connected to Supabase.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f3ee' },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 40 },
  loading: { flex: 1, backgroundColor: '#f8f3ee', justifyContent: 'center', alignItems: 'center' },
  heroImage: { width: '100%', height: 310, borderRadius: 22, marginBottom: 18 },
  category: { fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: '#586b61', fontWeight: '700' },
  name: { fontSize: 34, fontWeight: '800', color: '#1c2d29', marginTop: 8 },
  price: { fontSize: 28, fontWeight: '700', color: '#1c2d29', marginTop: 8, marginBottom: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1d2a28', marginTop: 18, marginBottom: 10 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatchButton: {
    borderWidth: 1,
    borderColor: '#d8d0c1',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  swatchSelected: { backgroundColor: '#e8efe8', borderColor: '#1e3d33' },
  swatchDisabled: { opacity: 0.45 },
  swatchText: { fontWeight: '700', color: '#1b2d2a' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  stepper: {
    width: 38,
    height: 38,
    borderRadius: 99,
    backgroundColor: '#edf0eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperText: { fontSize: 24, color: '#1c2d29', fontWeight: '700' },
  quantityValue: { fontSize: 18, fontWeight: '700', color: '#1b2a25', minWidth: 44, textAlign: 'center', marginHorizontal: 18 },
  addButton: { backgroundColor: '#1e3d33', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  addButtonDisabled: { backgroundColor: '#87928a' },
  addText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  description: { fontSize: 16, color: '#53645d', lineHeight: 24 },
  feature: { fontSize: 15, color: '#384f49', marginBottom: 8 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#e3d8c4', paddingBottom: 8, marginBottom: 8 },
  specLabel: { fontSize: 15, fontWeight: '600', color: '#23352f', flex: 1 },
  specValue: { fontSize: 15, color: '#53645d', flex: 1, textAlign: 'right' },
  empty: { fontSize: 18, color: '#23352f' },
  notice: { marginTop: 18, fontSize: 12, color: '#6c7a71', textTransform: 'uppercase', letterSpacing: 1.1 },
});
