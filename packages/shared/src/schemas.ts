import { z } from "zod";
import { AUDIENCE_OPTIONS, NUDGE_TYPES, PAGE_SIZE, TIER_CAPS, TIER_ORDER } from "./constants";

export const tierIdSchema = z.enum(TIER_ORDER);
export const audienceSchema = z.enum(AUDIENCE_OPTIONS);
export const nudgeTypeSchema = z.enum(NUDGE_TYPES);

export const userProfileSchema = z.object({
  id: z.string(),
  did: z.string(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const tierMembershipSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  memberId: z.string(),
  tier: tierIdSchema,
  createdAt: z.string(),
  lastMeaningfulInteractionAt: z.string().nullable().optional(),
});

export const postSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  audience: audienceSchema,
  body: z.string().min(1).max(500),
  photoUrl: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const commentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  authorId: z.string(),
  body: z.string().min(1).max(280),
  createdAt: z.string(),
});

export const reactionSchema = z.object({
  id: z.string(),
  postId: z.string(),
  authorId: z.string(),
  emoji: z.string().min(1).max(8),
  createdAt: z.string(),
});

export const feedItemSchema = z.object({
  post: postSchema,
  author: userProfileSchema,
  comments: z.array(commentSchema),
  reactions: z.array(reactionSchema),
});

export const feedPageSchema = z.object({
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullable().optional(),
});

export const blockSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  blockedUserId: z.string(),
  createdAt: z.string(),
});

export const muteSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  mutedUserId: z.string(),
  createdAt: z.string(),
});

export const nudgeSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  type: nudgeTypeSchema,
  title: z.string(),
  body: z.string(),
  acknowledgedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const sessionExchangeSchema = z.object({
  did: z.string(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  provider: z.enum(["demo", "atproto"]).default("demo"),
  providerToken: z.string().optional(),
});

export const tierMembershipInputSchema = z.object({
  memberId: z.string(),
  tier: tierIdSchema,
});

export const moveMembershipSchema = z.object({
  membershipId: z.string(),
  tier: tierIdSchema,
});

export const createPostSchema = z.object({
  audience: audienceSchema,
  body: z.string().min(1).max(500),
  photoUrl: z.string().url().nullable().optional(),
});

export const listFeedQuerySchema = z.object({
  tier: tierIdSchema,
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE).default(PAGE_SIZE),
});

export const createCommentSchema = z.object({
  postId: z.string(),
  body: z.string().min(1).max(280),
});

export const createReactionSchema = z.object({
  postId: z.string(),
  emoji: z.string().min(1).max(8),
});

export const createBlockSchema = z.object({
  blockedUserId: z.string(),
});

export const createMuteSchema = z.object({
  mutedUserId: z.string(),
});

export const acknowledgeNudgeSchema = z.object({
  nudgeId: z.string(),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(64),
  bio: z.string().max(160).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const tierCapSchema = z.object(TIER_CAPS);
