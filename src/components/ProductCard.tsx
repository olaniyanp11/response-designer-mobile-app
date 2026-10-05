import { Link } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Product } from '../lib/types';

const priceFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export function ProductCard({
  product,
  onQuickAdd,
}: {
  product: Product;
  onQuickAdd?: (product: Product) => void;
}) {
  const firstVariant = product.colors.find((variant) => variant.is_active && variant.stock_quantity > 0);

  return (
    <View style={styles.card}>
      <Link href={`/products/${product.slug}`} asChild>
        <Pressable style={styles.imageWrap}>
          {product.images[0] ? (
            <Image source={{ uri: product.images[0] }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder} />
          )}
        </Pressable>
      </Link>

      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.availability}>{product.available ? 'In stock' : 'Sold out'}</Text>
        </View>

        <Link href={`/products/${product.slug}`} asChild>
          <Pressable>
            <Text style={styles.name}>{product.name}</Text>
          </Pressable>
        </Link>

        <Text style={styles.description} numberOfLines={2}>{product.short_description}</Text>

        <View style={styles.bottomRow}>
          <Text style={styles.price}>{priceFormatter.format(product.price)}</Text>
          <Pressable
            onPress={() => onQuickAdd?.(product)}
            disabled={!firstVariant || !onQuickAdd}
            style={[styles.quickAddButton, (!firstVariant || !onQuickAdd) && styles.quickAddDisabled]}
          >
            <Text style={styles.quickAddText}>{firstVariant ? 'Add' : 'Sold out'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e8e1d2',
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageWrap: {
    width: '100%',
    height: 220,
    backgroundColor: '#f5f1ea',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e8e1d2',
  },
  content: {
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  category: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#5f6a57',
    fontWeight: '700',
  },
  availability: {
    fontSize: 11,
    color: '#48614d',
    fontWeight: '600',
  },
  name: {
    fontSize: 23,
    fontWeight: '700',
    color: '#1b2a25',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#516059',
    lineHeight: 20,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1a2d29',
  },
  quickAddButton: {
    backgroundColor: '#1e3d33',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  quickAddText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  quickAddDisabled: {
    backgroundColor: '#87928a',
  },
});
