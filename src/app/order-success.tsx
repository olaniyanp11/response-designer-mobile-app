import { Link, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function OrderSuccessScreen() {
  const params = useLocalSearchParams<{ orderNumber?: string; customerEmail?: string; emailStatus?: string }>();
  const orderNumber = params.orderNumber ?? 'NOM-0000';
  const customerEmail = params.customerEmail ?? 'customer@example.com';
  const emailStatus = params.emailStatus === 'sent' ? 'Customer email sent' : 'Email pending';

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>Order placed</Text>
      <Text style={styles.number}>{orderNumber}</Text>
      <Text style={styles.message}>Thank you. Your order has been received and is now being prepared.</Text>
      <Text style={styles.meta}>Customer email: {customerEmail}</Text>
      <Text style={styles.meta}>{emailStatus}</Text>

      <Link href="/(tabs)" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Continue shopping</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f3ee', justifyContent: 'center', padding: 28 },
  badge: { fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#5d6c60', fontWeight: '700', marginBottom: 12 },
  number: { fontSize: 36, fontWeight: '800', color: '#1c2d29', marginBottom: 12 },
  message: { fontSize: 16, color: '#516059', lineHeight: 24, marginBottom: 12 },
  meta: { fontSize: 15, color: '#23352f', marginBottom: 8 },
  button: { backgroundColor: '#1e3d33', paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
