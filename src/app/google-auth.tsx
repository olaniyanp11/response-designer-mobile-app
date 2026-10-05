import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LoadingScreen } from '../components/LoadingScreen';
import { createSessionFromAuthParams, getGoogleReturnTo } from '../lib/googleAuth';

export default function GoogleAuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [error, setError] = useState<string | null>(null);
  const code = typeof params.code === 'string' ? params.code : undefined;
  const authError = typeof params.error_description === 'string'
    ? params.error_description
    : typeof params.error === 'string'
      ? params.error
      : undefined;

  useEffect(() => {
    if (!code && !authError) return;

    let cancelled = false;
    createSessionFromAuthParams({ code, error: authError })
      .then((session) => {
        if (cancelled || !session) return;
        router.replace(getGoogleReturnTo());
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      });

    return () => {
      cancelled = true;
    };
  }, [authError, code]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Google sign-in failed</Text>
        <Text style={styles.message}>{error}</Text>
        <Pressable onPress={() => router.replace('/auth')} style={styles.button}>
          <Text style={styles.buttonText}>Back to sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (!code && !authError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Finishing Google sign-in</Text>
        <Pressable onPress={() => router.replace('/auth')} style={styles.button}>
          <Text style={styles.buttonText}>Back to sign in</Text>
        </Pressable>
      </View>
    );
  }

  return <LoadingScreen />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f3ee', justifyContent: 'center', padding: 28 },
  title: { fontSize: 24, fontWeight: '800', color: '#1c2d29', marginBottom: 8 },
  message: { fontSize: 16, color: '#b13d3d', marginBottom: 18 },
  button: { backgroundColor: '#1e3d33', paddingVertical: 13, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
