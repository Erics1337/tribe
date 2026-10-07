import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns';
import { Agent as HttpAgent, fetch as httpFetch } from 'undici';
import ipaddr from 'ipaddr.js';
import {
  NodeOAuthClient,
  type NodeSavedSession,
  type NodeSavedState,
} from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { BskyAgent } from '@atproto/api';
import { transaction, type DB } from '@tribe/db';
import {
  seal,
  unseal,
  token,
  hash,
  challenge,
  equal,
  issueSession,
  HttpError,
} from './security.js';
import { Store } from './store.js';
import type { Config } from './config.js';
const dispatcher = new HttpAgent({
  connect: {
    lookup: (hostname, options, callback) => {
      lookup(hostname, { all: true }, (err, addresses) => {
        if (err) return callback(err, '', 4);
        if (
          !addresses.length ||
          addresses.some((a) => ipaddr.process(a.address).range() !== 'unicast')
        )
          return callback(new Error('Private network destinations are forbidden.'), '', 4);
        if (typeof options === 'object' && options.all) return (callback as any)(null, addresses);
        const a = addresses[0]!;
        callback(null, a.address, a.family);
      });
    },
  },
});
export const safeFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  let url = new URL(request.url);
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();
  for (let i = 0; i < 5; i++) {
    if (
      url.protocol !== 'https:' ||
      (url.port && url.port !== '443') ||
      url.username ||
      url.password
    )
      throw new Error('Only public HTTPS destinations are permitted.');
    if (
      ipaddr.isValid(url.hostname.replace(/^\[|\]$/g, '')) &&
      ipaddr.process(url.hostname.replace(/^\[|\]$/g, '')).range() !== 'unicast'
    )
      throw new Error('Private destinations are forbidden.');
    const r = await httpFetch(url, {
      method: request.method,
      headers: request.headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
      dispatcher,
    } as Parameters<typeof httpFetch>[1]);
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      if (
        !['GET', 'HEAD'].includes(request.method) ||
        request.headers.has('authorization') ||
        request.headers.has('dpop')
      )
        throw new Error('Authenticated redirects are forbidden.');
      url = new URL(r.headers.get('location')!, url);
      continue;
    }
    return r as unknown as Response;
  }
  throw new Error('Too many redirects.');
};
export async function createOAuth(db: DB, c: Config) {
  const makeStore = <T>(prefix: string, seconds: number) => ({
    async get(key: string): Promise<T | undefined> {
      const r = await db.query('SELECT value FROM auth_data WHERE key=$1 AND expires_at>now()', [
        prefix + key,
      ]);
      return r.rows[0] ? unseal<T>(r.rows[0].value, c.ENCRYPTION_KEY) : undefined;
    },
    async set(key: string, value: T) {
      await db.query(
        "INSERT INTO auth_data (key,value,expires_at) VALUES ($1,$2,now()+$3*interval '1 second') ON CONFLICT (key) DO UPDATE SET value=excluded.value,expires_at=excluded.expires_at",
        [prefix + key, seal(value, c.ENCRYPTION_KEY), seconds],
      );
    },
    async del(key: string) {
      await db.query('DELETE FROM auth_data WHERE key=$1', [prefix + key]);
    },
  });
  const confidential = Boolean(c.OAUTH_PRIVATE_JWK);
  const local = c.PUBLIC_URL.startsWith('http://localhost:');
  const callback =
    (local ? c.PUBLIC_URL.replace('localhost', '127.0.0.1') : c.PUBLIC_URL) + '/auth/callback';
  const clientId = local
    ? `http://localhost?redirect_uri=${encodeURIComponent(callback)}&scope=atproto`
    : c.PUBLIC_URL + '/oauth-client-metadata.json';
  const client = new NodeOAuthClient({
    clientMetadata: {
      client_id: clientId,
      client_name: 'Tribe',
      client_uri: local ? undefined : c.PUBLIC_URL,
      redirect_uris: [callback],
      scope: 'atproto',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: local ? 'native' : 'web',
      token_endpoint_auth_method: confidential ? 'private_key_jwt' : 'none',
      ...(confidential
        ? { token_endpoint_auth_signing_alg: 'ES256', jwks_uri: c.PUBLIC_URL + '/jwks.json' }
        : {}),
      dpop_bound_access_tokens: true,
    },
    keyset: confidential
      ? [await JoseKey.fromImportable(JSON.parse(c.OAUTH_PRIVATE_JWK!), 'tribe-oauth-1')]
      : undefined,
    stateStore: makeStore<NodeSavedState>('state:', 600),
    sessionStore: makeStore<NodeSavedSession>('session:', 86400 * 30),
    fetch: safeFetch,
    requestLock: async (key, fn) => {
      const conn = await db.connect();
      try {
        await conn.query('SELECT pg_advisory_lock(hashtext($1))', ['oauth:' + key]);
        return await fn();
      } finally {
        await conn.query('SELECT pg_advisory_unlock(hashtext($1))', ['oauth:' + key]);
        conn.release();
      }
    },
  });
  const store = new Store(db);
  return {
    client,
    async start(handle: string, challengeValue: string, platform: string) {
      const id = randomUUID();
      await db.query(
        "INSERT INTO login_transactions (id,challenge,platform,expires_at) VALUES ($1,$2,$3,now()+interval '10 minutes')",
        [id, challengeValue, platform],
      );
      try {
        return {
          url: (await client.authorize(handle, { state: id, scope: 'atproto' })).toString(),
        };
      } catch (e) {
        await db.query('DELETE FROM login_transactions WHERE id=$1', [id]);
        throw new HttpError(400, 'Could not start sign-in. Check your handle and try again.');
      }
    },
    async callback(params: URLSearchParams) {
      const { session, state } = await client.callback(params);
      const pending = await db.query(
        'SELECT platform FROM login_transactions WHERE id=$1 AND expires_at>now() AND did IS NULL',
        [state],
      );
      if (!pending.rows[0]) throw new HttpError(400, 'This sign-in has expired.');
      let handle: string = session.did,
        name = 'Tribe member',
        avatar: string | null = null;
      try {
        const p = await new BskyAgent({ service: 'https://public.api.bsky.app' }).getProfile({
          actor: session.did,
        });
        handle = p.data.handle;
        name = p.data.displayName ?? handle;
        avatar = p.data.avatar ?? null;
      } catch {}
      await store.upsertIdentity(session.did, handle, name, avatar);
      const code = token();
      const r = await db.query(
        "UPDATE login_transactions SET did=$2,code_hash=$3,expires_at=now()+interval '1 minute' WHERE id=$1 AND did IS NULL RETURNING platform",
        [state, session.did, hash(code)],
      );
      if (!r.rows[0]) throw new HttpError(400, 'This sign-in was already completed.');
      const target =
        r.rows[0].platform === 'web'
          ? new URL('auth-return', c.WEB_URL.replace(/\/$/, '') + '/')
          : new URL('tribe://auth-return');
      target.searchParams.set('code', code);
      return target.toString();
    },
    async redeem(code: string, verifier: string) {
      return transaction(db, async (q) => {
        const r = await q.query(
          'SELECT * FROM login_transactions WHERE code_hash=$1 AND expires_at>now() FOR UPDATE',
          [hash(code)],
        );
        const p = r.rows[0];
        if (!p || !p.did || !equal(p.challenge, challenge(verifier)))
          throw new HttpError(400, 'This sign-in could not be verified.');
        await q.query('DELETE FROM login_transactions WHERE id=$1', [p.id]);
        const u = await q.query('SELECT id FROM users WHERE did=$1 AND active', [p.did]);
        if (!u.rows[0]) throw new HttpError(403, 'This account is unavailable.');
        return issueSession(q, u.rows[0].id);
      });
    },
  };
}
