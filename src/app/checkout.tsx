import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';

const priceFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export default function CheckoutScreen() {
  const { items, subtotal, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    note: '',
  });

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active || !session?.user) return;
      setForm((current) => ({
        ...current,
        email: session.user.email || current.email,
        fullName: typeof session.user.user_metadata?.full_name === 'string' ? session.user.user_metadata.full_name : current.fullName,
      }));
    });
    return () => {
      active = false;
    };
  }, []);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validate = () => {
    if (!items.length) return 'Your cart is empty';
    if (form.fullName.trim().length < 2) return 'Please provide a valid name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Please provide a valid email address.';
    if (form.phone.trim().length < 7) return 'Please provide a valid phone number.';
    if (form.address.trim().length < 8) return 'Please provide a delivery address.';
    if (form.city.trim().length < 2) return 'Please provide a city.';
    if (form.state.trim().length < 2) return 'Please provide a state.';
    if (form.country.trim().length < 2) return 'Please provide a country.';
    if (form.note.length > 500) return 'Note must be 500 characters or fewer.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!supabase) {
      setError('Supabase is not configured. Add the project URL and publishable key.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/auth?returnTo=/checkout');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

      const { data: order, error: orderError } = await supabase.rpc('place_order_from_cart', {
        p_idempotency_key: idempotencyKey,
        p_customer_name: form.fullName.trim(),
        p_customer_email: form.email.trim(),
        p_phone: form.phone.trim(),
        p_delivery_address: form.address.trim(),
        p_city: form.city.trim(),
        p_state: form.state.trim(),
        p_country: form.country.trim(),
        p_note: form.note.trim() || null,
      });

      if (orderError || !order) {
        throw new Error(orderError?.message || 'The order could not be created.');
      }

      const notificationResult = await supabase.functions.invoke('send-order-email', {
        body: { orderId: order.id },
      });

      await clear();
      router.replace({
        pathname: '/order-success',
        params: {
          orderNumber: order.order_number,
          customerEmail: order.customer_email,
          emailStatus: notificationResult.error ? 'pending' : 'sent',
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Checkout</Text>
      <Text style={styles.subtitle}>No payment collected. We will contact you to confirm delivery.</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Cart total</Text>
        <Text style={styles.summaryValue}>{priceFormatter.format(subtotal)}</Text>
      </View>

      <TextInput placeholder="Full name" value={form.fullName} onChangeText={(value) => updateField('fullName', value)} placeholderTextColor="#6e7a73" style={styles.input} />
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(value) => updateField('email', value)} placeholderTextColor="#6e7a73" style={styles.input} />
      <TextInput placeholder="Phone" keyboardType="phone-pad" value={form.phone} onChangeText={(value) => updateField('phone', value)} placeholderTextColor="#6e7a73" style={styles.input} />
      <TextInput placeholder="Delivery address" value={form.address} onChangeText={(value) => updateField('address', value)} placeholderTextColor="#6e7a73" style={styles.input} />
      <TextInput placeholder="City" value={form.city} onChangeText={(value) => updateField('city', value)} placeholderTextColor="#6e7a73" style={styles.input} />
      <TextInput placeholder="State" value={form.state} onChangeText={(value) => updateField('state', value)} placeholderTextColor="#6e7a73" style={styles.input} />
      <TextInput placeholder="Country" value={form.country} onChangeText={(value) => updateField('country', value)} placeholderTextColor="#6e7a73" style={styles.input} />
      <TextInput placeholder="Optional note" value={form.note} onChangeText={(value) => updateField('note', value)} multiline placeholderTextColor="#6e7a73" style={[styles.input, styles.noteInput]} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} disabled={loading} onPress={handleSubmit}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Place order</Text>}
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f3ee' },
  content: { padding: 24, paddingTop: 16, paddingBottom: 50 },
  title: { fontSize: 30, fontWeight: '800', color: '#1c2d29', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#586b61', marginBottom: 16 },
  summaryCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5ded0', borderRadius: 16, padding: 16, marginBottom: 18 },
  summaryLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.1, color: '#5f6a57' },
  summaryValue: { marginTop: 4, fontSize: 24, fontWeight: '800', color: '#1b2a25' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3d8c4',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#1c2d29',
  },
  noteInput: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: '#b13d3d', marginBottom: 12, fontSize: 14 },
  button: { backgroundColor: '#1e3d33', paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
