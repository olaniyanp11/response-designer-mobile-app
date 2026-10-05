import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { signInWithGoogle } from '../lib/googleAuth';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const returnTo = typeof params.returnTo === 'string' && params.returnTo.startsWith('/') ? params.returnTo : '/(tabs)';
  const busy = loading || googleLoading;

  const handleSubmit = async () => {
    if (!supabase) {
      setError('Supabase is not configured. Add the project URL and publishable key to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (result.error) throw result.error;
      if (!result.data.session) {
        setError('Account created. Confirm your email, then sign in.');
        setMode('sign-in');
        return;
      }
      router.replace(returnTo as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const outcome = await signInWithGoogle(returnTo as Href);
      if (outcome === 'success') router.replace(returnTo as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in with Google right now.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.container}>
      <Text style={styles.title}>{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</Text>
      <Text style={styles.subtitle}>Continue shopping with your NOMA account.</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#6e7a73"
        style={styles.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#6e7a73"
        secureTextEntry
        style={styles.input}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={busy}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</Text>}
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={styles.googleButton} onPress={handleGoogle} disabled={busy}>
        {googleLoading ? <ActivityIndicator color="#1e3d33" /> : <Text style={styles.googleButtonText}>Continue with Google</Text>}
      </Pressable>

      <Pressable onPress={() => setMode((prev) => (prev === 'sign-in' ? 'sign-up' : 'sign-in'))}>
        <Text style={styles.switchText}>
          {mode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </Text>
      </Pressable>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f3ee', justifyContent: 'center', padding: 24 },
  title: { fontSize: 30, fontWeight: '800', color: '#1c2d29', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#586b61', marginBottom: 18 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3d8c4',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#1b2a25',
  },
  button: { backgroundColor: '#1e3d33', paddingVertical: 13, borderRadius: 999, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e3d8c4' },
  dividerText: { marginHorizontal: 12, color: '#6e7a73', fontWeight: '600' },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3d8c4',
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
  },
  googleButtonText: { color: '#1e3d33', fontWeight: '700' },
  error: { color: '#b13d3d', marginBottom: 12, fontSize: 14 },
  switchText: { marginTop: 18, fontWeight: '600', color: '#234b41', textAlign: 'center' },
});
