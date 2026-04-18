import type { AUDIENCE_OPTIONS, NUDGE_TYPES, TIER_ORDER } from "./constants";

export type TierId = (typeof TIER_ORDER)[number];
export type Audience = (typeof AUDIENCE_OPTIONS)[number];
export type NudgeType = (typeof NUDGE_TYPES)[number];

export type TierCap = Record<TierId, number>;

export type UserProfile = {
  id: string;
  did: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: string;
};

export type TierMembership = {
  id: string;
  ownerId: string;
  memberId: string;
  tier: TierId;
  createdAt: string;
  lastMeaningfulInteractionAt?: string | null;
};

export type PostRecipient = {
  id: string;
  postId: string;
  recipientId: string;
  audience: Audience;
};

export type Post = {
  id: string;
  authorId: string;
  audience: Audience;
  body: string;
  photoUrl?: string | null;
  createdAt: string;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type Reaction = {
  id: string;
  postId: string;
  authorId: string;
  emoji: string;
  createdAt: string;
};

export type FeedItem = {
  post: Post;
  author: UserProfile;
  comments: Comment[];
  reactions: Reaction[];
};

export type Block = {
  id: string;
  ownerId: string;
  blockedUserId: string;
  createdAt: string;
};

export type Mute = {
  id: string;
  ownerId: string;
  mutedUserId: string;
  createdAt: string;
};

export type Nudge = {
  id: string;
  ownerId: string;
  type: NudgeType;
  title: string;
  body: string;
  acknowledgedAt?: string | null;
  createdAt: string;
};

export type FeedPage = {
  items: FeedItem[];
  nextCursor?: string | null;
};
