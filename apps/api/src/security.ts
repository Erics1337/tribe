import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from 'node:crypto';
import type { DB, Tx } from '@tribe/db';
export const token = () => randomBytes(32).toString('base64url');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const challenge = (value: string) => createHash('sha256').update(value).digest('base64url');
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function seal(value: unknown, key: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}
export function unseal<T>(value: string, key: string): T {
  const data = Buffer.from(value, 'base64');
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString(),
  ) as T;
}
export async function issueSession(db: DB | Tx, userId: string) {
  const accessToken = token(),
    refreshToken = token();
  const r = await db.query(
    "INSERT INTO sessions (user_id,access_hash,access_expires,refresh_hash,refresh_expires) VALUES ($1,$2,now()+interval '15 minutes',$3,now()+interval '30 days') RETURNING id",
    [userId, hash(accessToken), hash(refreshToken)],
  );
  return { accessToken, refreshToken, sessionId: r.rows[0].id as string };
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const deny = () => {
  throw new HttpError(404, 'This moment is unavailable.');
};
