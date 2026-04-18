import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import type { Audience, NudgeType, TierId } from "@tribe/shared";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    did: text("did").notNull().unique(),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    handleIdx: uniqueIndex("users_handle_idx").on(table.handle),
  }),
);

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    memberId: text("member_id").notNull(),
    tier: text("tier").$type<TierId>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
    lastMeaningfulInteractionAt: timestamp("last_meaningful_interaction_at", { withTimezone: true }),
  },
  (table) => ({
    ownerMemberIdx: uniqueIndex("memberships_owner_member_idx").on(table.ownerId, table.memberId),
    ownerTierIdx: index("memberships_owner_tier_idx").on(table.ownerId, table.tier),
  }),
);

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id").notNull(),
    audience: text("audience").$type<Audience>().notNull(),
    body: text("body").notNull(),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    authorIdx: index("posts_author_idx").on(table.authorId),
    createdAtIdx: index("posts_created_at_idx").on(table.createdAt),
  }),
);

export const postRecipients = pgTable(
  "post_recipients",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    recipientId: text("recipient_id").notNull(),
    audience: text("audience").$type<Audience>().notNull(),
  },
  (table) => ({
    recipientIdx: index("post_recipients_recipient_idx").on(table.recipientId),
    postRecipientIdx: uniqueIndex("post_recipients_post_recipient_idx").on(table.postId, table.recipientId),
  }),
);

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    authorId: text("author_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    postIdx: index("comments_post_idx").on(table.postId),
  }),
);

export const reactions = pgTable(
  "reactions",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    authorId: text("author_id").notNull(),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    postIdx: index("reactions_post_idx").on(table.postId),
    uniqueReactionIdx: uniqueIndex("reactions_post_author_emoji_idx").on(table.postId, table.authorId, table.emoji),
  }),
);

export const blocks = pgTable(
  "blocks",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    blockedUserId: text("blocked_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    ownerBlockedIdx: uniqueIndex("blocks_owner_blocked_idx").on(table.ownerId, table.blockedUserId),
  }),
);

export const mutes = pgTable(
  "mutes",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    mutedUserId: text("muted_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    ownerMutedIdx: uniqueIndex("mutes_owner_muted_idx").on(table.ownerId, table.mutedUserId),
  }),
);

export const nudges = pgTable(
  "nudges",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    type: text("type").$type<NudgeType>().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    ownerIdx: index("nudges_owner_idx").on(table.ownerId),
  }),
);

export const schema = {
  users,
  memberships,
  posts,
  postRecipients,
  comments,
  reactions,
  blocks,
  mutes,
  nudges,
};
