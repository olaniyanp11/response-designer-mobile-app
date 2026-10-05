import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LoadingScreen } from '../components/LoadingScreen';
import { CartProvider, useCart } from '../contexts/CartContext';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export function SuspenseFallback() {
  return <LoadingScreen />;
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorScreen}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Pressable onPress={retry} style={styles.retryButton}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

function AppNavigator() {
  const { initialized } = useCart();
  const hideSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (initialized) hideSplash();
  }, [hideSplash, initialized]);

  if (!initialized) {
    return <LoadingScreen onLayout={hideSplash} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#f7f2ea' },
          headerTintColor: '#1c2d29',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#f8f3ee' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: 'Account' }} />
        <Stack.Screen name="google-auth" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
        <Stack.Screen name="order-success" options={{ title: 'Order placed', headerBackVisible: false }} />
        <Stack.Screen name="products/[slug]" options={{ title: 'Chair' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <CartProvider>
      <AppNavigator />
    </CartProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: '#f8f3ee',
    justifyContent: 'center',
    padding: 28,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1c2d29',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#53645d',
    lineHeight: 24,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1e3d33',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
