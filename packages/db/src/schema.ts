import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
const id = () => uuid('id').primaryKey().defaultRandom();
const time = (n: string) => timestamp(n, { withTimezone: true }).notNull().defaultNow();
export const users = pgTable('users', {
  id: id(),
  did: text('did').notNull().unique(),
  handle: text('handle').notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio').notNull().default(''),
  onboarded: boolean('onboarded').notNull().default(false),
  active: boolean('active').notNull().default(true),
  graphVersion: integer('graph_version').notNull().default(0),
  pushToken: text('push_token'),
  notifications: boolean('notifications').notNull().default(false),
  quietStart: integer('quiet_start').notNull().default(22),
  quietEnd: integer('quiet_end').notNull().default(8),
  timezone: text('timezone').notNull().default('UTC'),
  createdAt: time('created_at'),
});
export const connections = pgTable(
  'connections',
  {
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    targetDid: text('target_did').notNull(),
    tier: text('tier').notNull(),
    createdAt: time('created_at'),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.targetDid] }),
    check('connection_tier', sql`${t.tier} in ('inner','close','tribe','village')`),
  ],
);
export const posts = pgTable(
  'posts',
  {
    id: id(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    tier: text('tier').notNull(),
    previewVersion: text('preview_version').notNull(),
    idempotencyKey: uuid('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    createdAt: time('created_at'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('post_retry').on(t.authorId, t.idempotencyKey),
    index('post_chronology').on(t.createdAt, t.id),
    check('post_tier', sql`${t.tier} in ('inner','close','tribe','village')`),
  ],
);
export const grants = pgTable(
  'post_grants',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id),
    recipientDid: text('recipient_did').notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.recipientDid] }),
    index('grant_recipient').on(t.recipientDid, t.postId),
  ],
);
export const media = pgTable('media', {
  id: id(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  postId: uuid('post_id').references(() => posts.id),
  objectKey: text('object_key').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  alt: text('alt').notNull().default(''),
  createdAt: time('created_at'),
});
export const comments = pgTable(
  'comments',
  {
    id: id(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    createdAt: time('created_at'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('comment_post').on(t.postId)],
);
export const reactions = pgTable(
  'reactions',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.postId, t.authorId] })],
);
export const blocks = pgTable(
  'blocks',
  {
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    targetDid: text('target_did').notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.targetDid] })],
);
export const mutes = pgTable(
  'mutes',
  {
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id),
    targetDid: text('target_did').notNull(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.targetDid] })],
);
export const sessions = pgTable('sessions', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  accessHash: text('access_hash').notNull().unique(),
  accessExpires: timestamp('access_expires', { withTimezone: true }).notNull(),
  refreshHash: text('refresh_hash').notNull().unique(),
  refreshExpires: timestamp('refresh_expires', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: time('created_at'),
});
export const refreshHistory = pgTable('refresh_history', {
  hash: text('hash').primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id),
});
export const authData = pgTable('auth_data', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
export const loginTransactions = pgTable('login_transactions', {
  id: uuid('id').primaryKey(),
  challenge: text('challenge').notNull(),
  platform: text('platform').notNull(),
  did: text('did'),
  codeHash: text('code_hash').unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
export const activity = pgTable('activity', {
  id: id(),
  recipientId: uuid('recipient_id')
    .notNull()
    .references(() => users.id),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id),
  kind: text('kind').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: time('created_at'),
});
export const outbox = pgTable('outbox', {
  id: id(),
  activityId: uuid('activity_id').references(() => activity.id),
  attempts: integer('attempts').notNull().default(0),
  availableAt: time('available_at'),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  lastError: text('last_error'),
});
export const reports = pgTable('reports', {
  id: id(),
  reporterId: uuid('reporter_id')
    .notNull()
    .references(() => users.id),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id),
  reason: text('reason').notNull(),
  evidence: jsonb('evidence').notNull(),
  status: text('status').notNull().default('open'),
  createdAt: time('created_at'),
});
export const audit = pgTable('audit', {
  id: id(),
  actorDid: text('actor_did').notNull(),
  action: text('action').notNull(),
  targetId: text('target_id').notNull(),
  createdAt: time('created_at'),
});
export const invitations = pgTable('invitations', {
  hash: text('hash').primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedBy: uuid('accepted_by').references(() => users.id),
});
