import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
export const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
export type Credentials = { accessToken: string; refreshToken: string; sessionId: string };
const key = 'tribe.session';
let credentials: Credentials | null = null;
let refreshPromise: Promise<void> | null = null;
let onExpired = () => {};
export function setExpiryHandler(fn: () => void) {
  onExpired = fn;
}
export async function setCredentials(value: Credentials | null) {
  credentials = value;
  const raw = value ? JSON.stringify(value) : null;
  if (Platform.OS === 'web') {
    if (raw) sessionStorage.setItem(key, raw);
    else sessionStorage.removeItem(key);
  } else if (raw) await SecureStore.setItemAsync(key, raw);
  else await SecureStore.deleteItemAsync(key);
}
export async function restoreCredentials() {
  const raw =
    Platform.OS === 'web' ? sessionStorage.getItem(key) : await SecureStore.getItemAsync(key);
  try {
    credentials = raw ? JSON.parse(raw) : null;
  } catch {
    await setCredentials(null);
  }
  return credentials;
}
export const getCredentials = () => credentials;
export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function refresh() {
  if (!credentials) throw new APIError(401, 'Please sign in.');
  const r = await fetch(API + '/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: credentials.refreshToken }),
  });
  if (!r.ok) {
    await setCredentials(null);
    onExpired();
    throw new APIError(401, 'Please sign in again.');
  }
  await setCredentials(await r.json());
}
export async function response(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (credentials) headers.set('Authorization', 'Bearer ' + credentials.accessToken);
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  const r = await fetch(API + path, { ...init, headers });
  if (r.status === 401 && retry && credentials) {
    if (!refreshPromise)
      refreshPromise = refresh().finally(() => {
        refreshPromise = null;
      });
    await refreshPromise;
    return response(path, init, false);
  }
  if (!r.ok) {
    let message = 'Could not connect. Please try again.';
    try {
      message = (await r.json()).message ?? message;
    } catch {}
    throw new APIError(r.status, message);
  }
  return r;
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  return (
    await response(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })
  ).json();
}
export const mediaSource = (id: string) => ({
  uri: API + '/media/' + id,
  headers: { Authorization: 'Bearer ' + (credentials?.accessToken ?? '') },
  cache: 'reload' as const,
});
