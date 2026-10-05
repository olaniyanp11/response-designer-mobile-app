import { router } from 'expo-router';
import { supabase } from './supabase';

export async function requireSignIn(returnTo: string) {
  if (supabase) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw new Error(`Unable to check your session: ${error.message}`);
    if (session?.user) return true;
  }

  router.push({ pathname: '/auth', params: { returnTo } });
  return false;
}
