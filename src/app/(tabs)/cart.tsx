import { Link } from 'expo-router';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../contexts/CartContext';
import { requireSignIn } from '../../lib/requireSignIn';

const priceFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export default function CartScreen() {
  const { items, subtotal, updateItemQuantity, removeItem, clear, initialized, isGuestCart } = useCart();
  const insets = useSafeAreaInsets();
  const cartReturnTo = '/(tabs)/cart';

  const changeCart = (action: () => Promise<void>) => {
    void (async () => {
      try {
        if (!(await requireSignIn(cartReturnTo))) return;
        await action();
      } catch (err) {
        Alert.alert('Could not update your cart', err instanceof Error ? err.message : 'Please try again.');
      }
    })();
  };

  if (!initialized) {
    return (
      <View style={[styles.emptyWrapper, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.emptyText}>Loading your cart…</Text>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={[styles.emptyWrapper, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.emptyTitle}>{isGuestCart ? 'Sign in to start your cart.' : 'Your cart is empty.'}</Text>
        <Text style={styles.emptyText}>
          {isGuestCart ? 'Chairs are saved to your account so the same cart is available on every device.' : 'A calm, ergonomic chair is waiting to be added.'}
        </Text>
        {isGuestCart ? (
          <Pressable style={[styles.primaryButton, styles.emptyAction]} onPress={() => { void requireSignIn(cartReturnTo); }}>
            <Text style={styles.primaryText}>Sign in</Text>
          </Pressable>
        ) : null}
        <Link href="/(tabs)/shop" asChild>
          <Pressable style={[isGuestCart ? styles.secondaryButton : styles.primaryButton, styles.emptyAction]}>
            <Text style={isGuestCart ? styles.secondaryText : styles.primaryText}>Browse chairs</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.heading}>Cart</Text>
      {isGuestCart ? (
        <View style={styles.signInCard}>
          <Text style={styles.signInTitle}>Sign in to use this cart.</Text>
          <Text style={styles.signInText}>Saved chairs stay on your account. Any cart from before sign-in is merged when you continue.</Text>
          <Pressable style={styles.primaryButton} onPress={() => { void requireSignIn(cartReturnTo); }}>
            <Text style={styles.primaryText}>Sign in</Text>
          </Pressable>
        </View>
      ) : null}

      {items.map((item) => (
        <View key={`${item.productId}-${item.variantId}`} style={styles.itemRow}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.imageBox} resizeMode="cover" />
          ) : (
            <View style={styles.imageBox}>
              <Text style={styles.imageText}>Chair</Text>
            </View>
          )}

          <View style={styles.details}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.variant}>{item.color}</Text>
            <Text style={styles.price}>{priceFormatter.format(item.price)}</Text>

            <View style={styles.quantityRow}>
              <Pressable onPress={() => changeCart(() => updateItemQuantity(item.variantId, item.quantity - 1))} style={styles.qtyButton}>
                <Text style={styles.qtyText}>-</Text>
              </Pressable>
              <Text style={styles.qtyValue}>{item.quantity}</Text>
              <Pressable onPress={() => changeCart(() => updateItemQuantity(item.variantId, item.quantity + 1))} style={styles.qtyButton}>
                <Text style={styles.qtyText}>+</Text>
              </Pressable>
            </View>
          </View>

          <Pressable onPress={() => changeCart(() => removeItem(item.variantId))} style={styles.removeButton}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{priceFormatter.format(subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery</Text>
          <Text style={styles.summaryValue}>TBD</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => changeCart(() => clear())} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Clear</Text>
        </Pressable>
        {isGuestCart ? (
          <Pressable style={styles.primaryButton} onPress={() => { void requireSignIn(cartReturnTo); }}>
            <Text style={styles.primaryText}>Sign in to check out</Text>
          </Pressable>
        ) : (
          <Link href="/checkout" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryText}>Proceed to checkout</Text>
            </Pressable>
          </Link>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f3ee' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  heading: { fontSize: 30, fontWeight: '800', color: '#1c2d29', marginBottom: 18 },
  itemRow: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5ded0',
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 12,
  },
  imageBox: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: '#e8e0d0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageText: { fontSize: 12, color: '#33443d', fontWeight: '700' },
  details: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: '#1a2f2a' },
  variant: { fontSize: 13, color: '#65746a', marginTop: 3 },
  price: { fontSize: 16, fontWeight: '700', color: '#1b2a25', marginTop: 8 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#eef0eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: { fontSize: 18, fontWeight: '700', color: '#22382f' },
  qtyValue: { marginHorizontal: 12, fontSize: 15, fontWeight: '700', color: '#1c2d29' },
  removeButton: { alignSelf: 'center', paddingVertical: 8 },
  removeText: { color: '#9b423b', fontWeight: '700' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e5ded0', padding: 16, marginTop: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 15, color: '#53645d' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#1b2a25' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  primaryButton: { backgroundColor: '#1e3d33', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, flex: 1, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { backgroundColor: '#eef0eb', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, flex: 1, alignItems: 'center' },
  secondaryText: { color: '#22382f', fontWeight: '700' },
  emptyWrapper: { flex: 1, backgroundColor: '#f8f3ee', justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyAction: { flex: 0, alignSelf: 'stretch', marginBottom: 10 },
  emptyTitle: { fontSize: 26, fontWeight: '800', color: '#1c2d29', marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#5d6962', textAlign: 'center', marginBottom: 16 },
  signInCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e5ded0', padding: 16, marginBottom: 16 },
  signInTitle: { fontSize: 18, fontWeight: '800', color: '#1c2d29', marginBottom: 6 },
  signInText: { fontSize: 15, color: '#53645d', marginBottom: 14, lineHeight: 21 },
});
