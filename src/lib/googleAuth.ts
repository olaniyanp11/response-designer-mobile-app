import * as Linking from 'expo-linking';
import type { Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_PATH = 'google-auth';
const exchanges = new Map<string, Promise<Session | null>>();
let pendingReturnTo: Href = '/(tabs)';
let pendingFlowId: string | null = null;

export function getGoogleRedirectUri() {
  return Linking.createURL(REDIRECT_PATH, { scheme: 'noma' });
}

export function getGoogleReturnTo() {
  return pendingReturnTo;
}

type AuthCallbackParams = {
  code?: string;
  error?: string;
  error_description?: string;
};

function readAuthParams(url: string): AuthCallbackParams {
  const parsed = new URL(url);
  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  const query = new URLSearchParams(parsed.search);
  const fragment = new URLSearchParams(hash);

  const read = (key: keyof AuthCallbackParams) => query.get(key) || fragment.get(key) || undefined;

  return {
    code: read('code'),
    error: read('error'),
    error_description: read('error_description'),
  };
}

export async function createSessionFromAuthParams(params: AuthCallbackParams): Promise<Session | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key to continue.');
  }

  if (params.error || params.error_description) {
    throw new Error(params.error_description || params.error || 'Google sign-in was rejected.');
  }

  if (!params.code) return null;
  const existing = exchanges.get(params.code);
  if (existing) return existing;

  const code = params.code;
  const task = supabase.auth
    .exchangeCodeForSession(code, pendingFlowId ? { flowId: pendingFlowId } : undefined)
    .then(({ data, error }) => {
      if (error) throw error;
      return data.session;
    })
    .catch((error: unknown) => {
      exchanges.delete(code);
      throw error;
    });
  exchanges.set(code, task);
  return task;
}

export async function createSessionFromUrl(url: string) {
  return createSessionFromAuthParams(readAuthParams(url));
}

export async function signInWithGoogle(returnTo: Href): Promise<'success' | 'cancelled'> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key to continue.');
  }

  pendingReturnTo = returnTo;
  const redirectTo = getGoogleRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in did not return a login URL.');
  pendingFlowId = data.flowId ?? null;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss' || result.type === 'locked') {
    return 'cancelled';
  }
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in did not return to the app.');
  }

  const session = await createSessionFromUrl(result.url);
  if (!session) {
    throw new Error(`Google sign-in did not create a session. Allow this redirect in Supabase: ${redirectTo}`);
  }
  return 'success';
}
