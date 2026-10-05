import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, supabaseConfigError } from '../../lib/supabase';

export default function AccountScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [userLoaded, setUserLoaded] = useState(() => supabase === null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const authClient = supabase;
    if (!authClient) return;

    const syncUser = async () => {
      const { data: { session } } = await authClient.auth.getSession();
      setEmail(session?.user?.email ?? null);
      setUserLoaded(true);
    };

    void syncUser();

    const { data: sub } = authClient.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  if (!userLoaded) {
    return <View style={styles.container}><Text style={styles.text}>Loading…</Text></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>Account</Text>

      {supabaseConfigError ? <Text style={styles.warning}>{supabaseConfigError}</Text> : null}

      {email ? (
        <>
          <Text style={styles.text}>Signed in as</Text>
          <Text style={styles.email}>{email}</Text>
          <Pressable onPress={handleSignOut} style={styles.button}>
            <Text style={styles.buttonText}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.text}>Sign in to save your cart and place an order.</Text>
          <Link href="/auth" asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Go to sign in</Text>
            </Pressable>
          </Link>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f3ee', justifyContent: 'center', padding: 24 },
  title: { fontSize: 30, fontWeight: '800', color: '#1c2d29', marginBottom: 12 },
  text: { fontSize: 16, color: '#53645d', marginBottom: 12 },
  warning: { fontSize: 15, color: '#b13d3d', marginBottom: 12 },
  email: { fontSize: 18, fontWeight: '700', color: '#1f362e', marginBottom: 24 },
  button: { backgroundColor: '#1e3d33', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
