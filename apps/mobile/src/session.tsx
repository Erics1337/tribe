import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Profile } from '@tribe/domain';
import { api, restoreCredentials, setCredentials, setExpiryHandler, type Credentials } from './api';
const context = createContext<{
  user: Profile | null;
  loading: boolean;
  reload: () => Promise<void>;
  login: (handle: string) => Promise<void>;
  complete: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  reload: async () => {},
  login: async () => {},
  complete: async () => {},
  logout: async () => {},
});
const verifierKey = 'tribe.login-verifier';
const writeVerifier = async (v: string) => {
  if (Platform.OS === 'web') sessionStorage.setItem(verifierKey, v);
  else await SecureStore.setItemAsync(verifierKey, v);
};
const readVerifier = async () =>
  Platform.OS === 'web'
    ? sessionStorage.getItem(verifierKey)
    : SecureStore.getItemAsync(verifierKey);
const clearVerifier = async () => {
  if (Platform.OS === 'web') sessionStorage.removeItem(verifierKey);
  else await SecureStore.deleteItemAsync(verifierKey);
};
const b64 = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
let completion: Promise<void> | null = null;
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null),
    [loading, setLoading] = useState(true);
  const query = useQueryClient();
  const clear = async () => {
    query.clear();
    setUser(null);
    await AsyncStorage.removeItem('tribe.draft');
    await setCredentials(null);
  };
  const reload = async () => {
    setUser(await api<Profile>('/me'));
  };
  useEffect(() => {
    setExpiryHandler(() => {
      query.clear();
      setUser(null);
    });
    restoreCredentials()
      .then(async (c) => {
        if (c) await reload();
      })
      .catch(() => setCredentials(null))
      .finally(() => setLoading(false));
  }, []);
  const complete = async (code: string) => {
    if (completion) return completion;
    completion = (async () => {
      const verifier = await readVerifier();
      if (!verifier) throw new Error('This sign-in expired. Please try again.');
      const c = await api<Credentials>('/auth/redeem', 'POST', { code, verifier });
      await setCredentials(c);
      await clearVerifier();
      query.clear();
      await reload();
    })().finally(() => {
      completion = null;
    });
    return completion;
  };
  const login = async (handle: string) => {
    const verifier = b64(await Crypto.getRandomBytesAsync(32));
    await writeVerifier(verifier);
    const hex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
    const digest = b64(Uint8Array.from(hex.match(/.{2}/g)!, (x) => parseInt(x, 16)));
    const { url } = await api<{ url: string }>('/auth/start', 'POST', {
      handle,
      challenge: digest,
      platform: Platform.OS === 'web' ? 'web' : 'native',
    });
    if (Platform.OS === 'web') {
      window.location.assign(url);
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(url, 'tribe://auth-return');
    if (result.type === 'success') {
      const code = new URL(result.url).searchParams.get('code');
      if (!code) throw new Error('Sign-in did not finish.');
      await complete(code);
    } else throw new Error('Sign-in was cancelled.');
  };
  const logout = async () => {
    try {
      await api('/auth/logout', 'POST');
    } finally {
      await clear();
    }
  };
  return (
    <context.Provider value={{ user, loading, reload, login, complete, logout }}>
      {children}
    </context.Provider>
  );
}
export const useSession = () => useContext(context);

export async function navigateAfterLogin() {
  const { router } = await import('expo-router');
  const invite = await AsyncStorage.getItem('tribe.pending-invite');
  if (invite) {
    await AsyncStorage.removeItem('tribe.pending-invite');
    router.replace({ pathname: '/invite', params: { token: invite } });
  } else router.replace('/');
}
