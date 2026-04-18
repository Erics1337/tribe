import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env";
import { schema } from "./schema";

export type Database = any;

const CREATE_SQL = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    did TEXT NOT NULL UNIQUE,
    handle TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    tier TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_meaningful_interaction_at TIMESTAMPTZ,
    CONSTRAINT memberships_owner_member_unique UNIQUE (owner_id, member_id)
  );`,
  `CREATE INDEX IF NOT EXISTS memberships_owner_tier_idx ON memberships(owner_id, tier);`,
  `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    audience TEXT NOT NULL,
    body TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS posts_author_idx ON posts(author_id);`,
  `CREATE TABLE IF NOT EXISTS post_recipients (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    audience TEXT NOT NULL,
    CONSTRAINT post_recipients_post_recipient_unique UNIQUE (post_id, recipient_id)
  );`,
  `CREATE INDEX IF NOT EXISTS post_recipients_recipient_idx ON post_recipients(recipient_id);`,
  `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS comments_post_idx ON comments(post_id);`,
  `CREATE TABLE IF NOT EXISTS reactions (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reactions_post_author_emoji_unique UNIQUE (post_id, author_id, emoji)
  );`,
  `CREATE INDEX IF NOT EXISTS reactions_post_idx ON reactions(post_id);`,
  `CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    blocked_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT blocks_owner_blocked_unique UNIQUE (owner_id, blocked_user_id)
  );`,
  `CREATE TABLE IF NOT EXISTS mutes (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    muted_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mutes_owner_muted_unique UNIQUE (owner_id, muted_user_id)
  );`,
  `CREATE TABLE IF NOT EXISTS nudges (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS nudges_owner_idx ON nudges(owner_id);`,
];

async function ensureSchema(pool: Pool): Promise<void> {
  for (const statement of CREATE_SQL) {
    await pool.query(statement);
  }
}

async function ensurePgliteSchema(client: PGlite): Promise<void> {
  for (const statement of CREATE_SQL) {
    await client.exec(statement);
  }
}

export async function createDatabaseClient(): Promise<{ db: Database; pool?: Pool; mode: "memory" | "postgres" }> {
  if (env.DATABASE_URL) {
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    await ensureSchema(pool);
    return {
      db: drizzleNode(pool, { schema }) as Database,
      pool,
      mode: "postgres",
    };
  }

  const client = new PGlite();
  await ensurePgliteSchema(client);

  return {
    db: drizzlePglite(client, { schema }) as unknown as Database,
    mode: "memory",
  };
}
