import { z } from 'zod';
export const tiers = ['inner', 'close', 'tribe', 'village'] as const;
export const caps = { inner: 5, close: 15, tribe: 50, village: 150 } as const;
export const labels = {
  inner: 'Inner',
  close: 'Close',
  tribe: 'Tribe',
  village: 'Village',
} as const;
export type Tier = (typeof tiers)[number];
export const tierSchema = z.enum(tiers);
export const didSchema = z.string().regex(/^did:(plc:[a-z2-7]{24}|web:[A-Za-z0-9.:%_-]+)$/);
export const connectionSchema = z.object({ did: didSchema, tier: tierSchema });
export const postSchema = z
  .object({
    body: z.string().trim().max(2000),
    tier: tierSchema,
    previewVersion: z.string().min(1),
    mediaIds: z.array(z.uuid()).max(4).default([]),
    idempotencyKey: z.uuid(),
  })
  .refine((p) => p.body.length > 0 || p.mediaIds.length > 0, {
    message: 'Add a moment or a photo.',
  });
export const commentSchema = z.object({ body: z.string().trim().min(1).max(1000) });
export const loginSchema = z.object({
  handle: z.string().trim().min(1).max(253),
  challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  platform: z.enum(['native', 'web']),
});
export const redeemSchema = z.object({
  code: z.string().min(30).max(100),
  verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
});
export type Profile = {
  id: string;
  did: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  onboarded: boolean;
};
export type Connection = {
  did: string;
  tier: Tier;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  joined: boolean;
};
export type Asset = { id: string; alt: string; width: number; height: number };
export type Post = {
  id: string;
  body: string;
  createdAt: string;
  author: Profile;
  media: Asset[];
  commentCount: number;
  reactionCount: number;
  reacted: boolean;
};
export type Feed = { items: Post[]; cursor: string | null; watermark: string };
export type Comment = { id: string; body: string; createdAt: string; author: Profile };
export function nestedCounts(connections: Pick<Connection, 'tier'>[]) {
  return Object.fromEntries(
    tiers.map((t, i) => [t, connections.filter((c) => tiers.indexOf(c.tier) <= i).length]),
  ) as Record<Tier, number>;
}
export function assertCapacity(connections: Pick<Connection, 'tier'>[]) {
  const counts = nestedCounts(connections);
  for (const t of tiers)
    if (counts[t] > caps[t])
      throw new Error(`${labels[t]} is full. Choose someone to move before adding another person.`);
  return counts;
}
export function includesTier(audience: Tier, assigned: Tier) {
  return tiers.indexOf(assigned) <= tiers.indexOf(audience);
}
