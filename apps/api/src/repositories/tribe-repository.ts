import {
  and,
  desc,
  eq,
  inArray,
  or,
} from "drizzle-orm";
import {
  assertTierCapacity,
  buildAudienceSnapshot,
  buildCapacityNudges,
  buildInactivityNudges,
  paginateFeed,
  type Audience,
  type Block,
  type FeedItem,
  type FeedPage,
  type Mute,
  type Nudge,
  type Post,
  type TierId,
  type TierMembership,
  type UserProfile,
} from "@tribe/shared";
import { createId } from "../lib/id";
import { AppError } from "../lib/errors";
import type { Database } from "../db/client";
import { blocks, comments, memberships, mutes, nudges, postRecipients, posts, reactions, users } from "../db/schema";
import type { AtprotoDirectoryService, IdentityPayload } from "../services/atproto";

type UserRow = typeof users.$inferSelect;
type MembershipRow = typeof memberships.$inferSelect;
type PostRow = typeof posts.$inferSelect;
type CommentRow = typeof comments.$inferSelect;
type ReactionRow = typeof reactions.$inferSelect;
type BlockRow = typeof blocks.$inferSelect;
type MuteRow = typeof mutes.$inferSelect;
type NudgeRow = typeof nudges.$inferSelect;
type RecipientRow = typeof postRecipients.$inferSelect;

export class TribeRepository {
  constructor(
    private readonly db: Database,
    private readonly atproto: AtprotoDirectoryService,
  ) {}

  async seedDemoData(): Promise<void> {
    const existing = await this.db.select().from(users);
    if (existing.length > 0) {
      return;
    }

    const demoUsers = [
      { did: "did:demo:sophia", handle: "sophia.tribe.test", displayName: "Sophia Vale", bio: "Weekend hikes and long voice notes." },
      { did: "did:demo:marco", handle: "marco.tribe.test", displayName: "Marco Ibarra", bio: "Cooks for twelve, posts for two." },
      { did: "did:demo:nina", handle: "nina.tribe.test", displayName: "Nina Hart", bio: "Plant parent. Soft-launching everything." },
      { did: "did:demo:jasper", handle: "jasper.tribe.test", displayName: "Jasper Quinn", bio: "Runs, reads, and goes offline on purpose." },
      { did: "did:demo:riley", handle: "riley.tribe.test", displayName: "Riley Moss", bio: "Neighborhood potluck organizer." },
      { did: "did:demo:mina", handle: "mina.tribe.test", displayName: "Mina Sol", bio: "Photos from ordinary, good days." },
    ];

    for (const user of demoUsers) {
      await this.upsertUser({
        ...user,
        avatarUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(user.handle)}`,
        provider: "demo",
      });
    }
  }

  async upsertUser(identity: IdentityPayload): Promise<UserProfile> {
    const verified = await this.atproto.verifyIdentity(identity);
    const existing = await this.db.select().from(users).where(eq(users.did, verified.did));
    const now = new Date();

    if (existing[0]) {
      const [updated] = await this.db
        .update(users)
        .set({
          handle: verified.handle,
          displayName: verified.displayName,
          avatarUrl: verified.avatarUrl ?? null,
          bio: verified.bio ?? null,
        })
        .where(eq(users.id, existing[0].id))
        .returning();
      return mapUser(ensurePresent(updated));
    }

    const [created] = await this.db
      .insert(users)
      .values({
        id: createId("user"),
        did: verified.did,
        handle: verified.handle,
        displayName: verified.displayName,
        avatarUrl: verified.avatarUrl ?? null,
        bio: verified.bio ?? null,
        createdAt: now,
      })
      .returning();

    return mapUser(ensurePresent(created));
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    const [record] = await this.db.select().from(users).where(eq(users.id, userId));
    return record ? mapUser(record) : null;
  }

  async updateProfile(userId: string, input: Partial<Pick<UserProfile, "displayName" | "bio" | "avatarUrl">>) {
    const [updated] = await this.db
      .update(users)
      .set({
        displayName: input.displayName,
        bio: input.bio ?? null,
        avatarUrl: input.avatarUrl ?? null,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new AppError(404, "Profile not found.");
    }

    return mapUser(updated);
  }

  async searchUsers(query: string, viewerId: string): Promise<UserProfile[]> {
    const localUsers = ((await this.db.select().from(users)) as UserRow[]).filter((user: UserRow) => user.id !== viewerId);
    const filteredLocal = localUsers.filter((user: UserRow) => {
      const candidate = `${user.handle} ${user.displayName}`.toLowerCase();
      return candidate.includes(query.trim().toLowerCase());
    });

    const remoteUsers = await this.atproto.searchActors(query);
    const blockedIds = new Set(await this.getBlockedPairIds(viewerId));
    const combined = [...filteredLocal.map(mapUser)];

    for (const actor of remoteUsers) {
      if (blockedIds.has(actor.did)) {
        continue;
      }

      const duplicate = combined.find((user) => user.did === actor.did || user.handle === actor.handle);
      if (!duplicate) {
        combined.push({
          id: actor.did,
          did: actor.did,
          handle: actor.handle,
          displayName: actor.displayName,
          avatarUrl: actor.avatarUrl ?? null,
          bio: actor.bio ?? null,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return combined.slice(0, 12);
  }

  async listMemberships(ownerId: string): Promise<Array<TierMembership & { member: UserProfile }>> {
    const rows = ((await this.db
      .select()
      .from(memberships)
      .where(eq(memberships.ownerId, ownerId))
      .orderBy(memberships.createdAt)) as MembershipRow[]);
    const memberIds = rows.map((row) => row.memberId);
    const people = memberIds.length > 0 ? (((await this.db.select().from(users).where(inArray(users.id, memberIds))) as UserRow[])) : [];
    const memberMap = new Map(people.map((person: UserRow) => [person.id, mapUser(person)]));

    return rows.map((row: MembershipRow) => ({
      ...mapMembership(row),
      member: memberMap.get(row.memberId) ?? {
        id: row.memberId,
        did: row.memberId,
        handle: row.memberId,
        displayName: row.memberId,
        createdAt: new Date().toISOString(),
      },
    }));
  }

  async createOrMoveMembership(ownerId: string, memberIdentifier: string, tier: TierId) {
    const member = await this.ensureUserFromIdentifier(memberIdentifier);
    if (member.id === ownerId) {
      throw new AppError(400, "You cannot add yourself to a tier.");
    }

    const existingRows = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.ownerId, ownerId), eq(memberships.memberId, member.id)));
    const tierMembers = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.ownerId, ownerId), eq(memberships.tier, tier)));

    if (!existingRows[0] || existingRows[0].tier !== tier) {
      assertTierCapacity(tierMembers.length, tier);
    }

    if (existingRows[0]) {
      const [updated] = await this.db
        .update(memberships)
        .set({ tier })
        .where(eq(memberships.id, existingRows[0].id))
      .returning();
      await this.seedWelcomePost(ownerId, member.id, tier);
      return mapMembership(ensurePresent(updated));
    }

    const [created] = await this.db
      .insert(memberships)
      .values({
        id: createId("membership"),
        ownerId,
        memberId: member.id,
        tier,
        createdAt: new Date(),
      })
      .returning();
    await this.seedWelcomePost(ownerId, member.id, tier);
    return mapMembership(ensurePresent(created));
  }

  async moveMembership(ownerId: string, membershipId: string, tier: TierId) {
    const [existing] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.ownerId, ownerId)));

    if (!existing) {
      throw new AppError(404, "Relationship not found.");
    }

    const tierMembers = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.ownerId, ownerId), eq(memberships.tier, tier)));

    if (existing.tier !== tier) {
      assertTierCapacity(tierMembers.length, tier);
    }

    const [updated] = await this.db
      .update(memberships)
      .set({ tier })
      .where(eq(memberships.id, membershipId))
      .returning();
    return mapMembership(ensurePresent(updated));
  }

  async createPost(authorId: string, input: { audience: Audience; body: string; photoUrl?: string | null }) {
    const authorMemberships = (await this.db.select().from(memberships).where(eq(memberships.ownerId, authorId))) as MembershipRow[];
    const [created] = await this.db
      .insert(posts)
      .values({
        id: createId("post"),
        authorId,
        audience: input.audience,
        body: input.body,
        photoUrl: input.photoUrl ?? null,
        createdAt: new Date(),
      })
      .returning();

    const createdPost = ensurePresent(created);
    const snapshot = buildAudienceSnapshot(mapPost(createdPost), authorMemberships.map(mapMembership));
    if (snapshot.length > 0) {
      await this.db.insert(postRecipients).values(
        snapshot.map((recipient) => ({
          id: createId("recipient"),
          postId: createdPost.id,
          recipientId: recipient.recipientId,
          audience: recipient.audience,
        })),
      );
    }

    return mapPost(createdPost);
  }

  async listFeed(viewerId: string, tier: TierId, cursor?: string | null, limit?: number): Promise<FeedPage> {
    const visibleAuthors = (await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.ownerId, viewerId), eq(memberships.tier, tier)))) as MembershipRow[];
    const authorIds = visibleAuthors.map((relationship) => relationship.memberId);

    if (authorIds.length === 0) {
      return { items: [], nextCursor: null };
    }

    const mutedAuthors = (await this.db.select().from(mutes).where(eq(mutes.ownerId, viewerId))) as MuteRow[];
    const mutedSet = new Set(mutedAuthors.map((mute: MuteRow) => mute.mutedUserId));

    const blockedPairs = ((await this.db
      .select()
      .from(blocks)
      .where(or(eq(blocks.ownerId, viewerId), eq(blocks.blockedUserId, viewerId)))) as BlockRow[]);
    const blockedAuthorIds = new Set(
      blockedPairs.flatMap((record: BlockRow) =>
        [record.ownerId === viewerId ? record.blockedUserId : null, record.blockedUserId === viewerId ? record.ownerId : null].filter(Boolean),
      ),
    );

    const recipientRows = (await this.db.select().from(postRecipients).where(eq(postRecipients.recipientId, viewerId))) as RecipientRow[];
    const accessiblePostIds = new Set(recipientRows.map((recipient: RecipientRow) => recipient.postId));

    const postRows = (await this.db.select().from(posts).orderBy(desc(posts.createdAt))) as PostRow[];
    const filteredPosts = postRows
      .filter((post: PostRow) => authorIds.includes(post.authorId))
      .filter((post: PostRow) => accessiblePostIds.has(post.id))
      .filter((post: PostRow) => !mutedSet.has(post.authorId))
      .filter((post: PostRow) => !blockedAuthorIds.has(post.authorId));

    const authorRows =
      filteredPosts.length > 0
        ? (((await this.db.select().from(users).where(inArray(users.id, [...new Set(filteredPosts.map((post: PostRow) => post.authorId))] as string[]))) as UserRow[]))
        : [];
    const authorMap = new Map(authorRows.map((author: UserRow) => [author.id, mapUser(author)]));

    const commentRows =
      filteredPosts.length > 0
        ? (((await this.db.select().from(comments).where(inArray(comments.postId, filteredPosts.map((post: PostRow) => post.id))).orderBy(comments.createdAt)) as CommentRow[]))
        : [];
    const reactionRows =
      filteredPosts.length > 0
        ? (((await this.db.select().from(reactions).where(inArray(reactions.postId, filteredPosts.map((post: PostRow) => post.id))).orderBy(reactions.createdAt)) as ReactionRow[]))
        : [];

    const items: FeedItem[] = filteredPosts.map((post: PostRow) => ({
      post: mapPost(post),
      author: authorMap.get(post.authorId)!,
      comments: commentRows.filter((comment: CommentRow) => comment.postId === post.id).map(mapComment),
      reactions: reactionRows.filter((reaction: ReactionRow) => reaction.postId === post.id).map(mapReaction),
    }));

    return paginateFeed(items, cursor, limit);
  }

  async createComment(authorId: string, postId: string, body: string) {
    const post = await this.requirePostVisibleToUser(postId, authorId);
    const [created] = await this.db
      .insert(comments)
      .values({
        id: createId("comment"),
        postId,
        authorId,
        body,
        createdAt: new Date(),
      })
      .returning();
    await this.markMeaningfulInteraction(authorId, post.authorId);
    return mapComment(ensurePresent(created));
  }

  async createReaction(authorId: string, postId: string, emoji: string) {
    const post = await this.requirePostVisibleToUser(postId, authorId);
    const [created] = await this.db
      .insert(reactions)
      .values({
        id: createId("reaction"),
        postId,
        authorId,
        emoji,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (!created) {
      const [existing] = await this.db
        .select()
        .from(reactions)
        .where(and(eq(reactions.postId, postId), eq(reactions.authorId, authorId), eq(reactions.emoji, emoji)));
      return mapReaction(ensurePresent(existing));
    }

    await this.markMeaningfulInteraction(authorId, post.authorId);
    return mapReaction(ensurePresent(created));
  }

  async deleteReaction(authorId: string, reactionId: string) {
    await this.db.delete(reactions).where(and(eq(reactions.id, reactionId), eq(reactions.authorId, authorId)));
  }

  async createBlock(ownerId: string, blockedUserId: string): Promise<Block> {
    const target = await this.ensureUserFromIdentifier(blockedUserId);
    const [created] = await this.db
      .insert(blocks)
      .values({
        id: createId("block"),
        ownerId,
        blockedUserId: target.id,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    return mapBlock(
      ensurePresent(
        created ??
          (
            await this.db.select().from(blocks).where(and(eq(blocks.ownerId, ownerId), eq(blocks.blockedUserId, target.id)))
          )[0],
      ),
    );
  }

  async deleteBlock(ownerId: string, blockedUserId: string) {
    await this.db.delete(blocks).where(and(eq(blocks.ownerId, ownerId), eq(blocks.blockedUserId, blockedUserId)));
  }

  async createMute(ownerId: string, mutedUserId: string): Promise<Mute> {
    const target = await this.ensureUserFromIdentifier(mutedUserId);
    const [created] = await this.db
      .insert(mutes)
      .values({
        id: createId("mute"),
        ownerId,
        mutedUserId: target.id,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    return mapMute(
      ensurePresent(
        created ??
          (
            await this.db.select().from(mutes).where(and(eq(mutes.ownerId, ownerId), eq(mutes.mutedUserId, target.id)))
          )[0],
      ),
    );
  }

  async deleteMute(ownerId: string, mutedUserId: string) {
    await this.db.delete(mutes).where(and(eq(mutes.ownerId, ownerId), eq(mutes.mutedUserId, mutedUserId)));
  }

  async listNudges(ownerId: string): Promise<Nudge[]> {
    const relationships = await this.db.select().from(memberships).where(eq(memberships.ownerId, ownerId));
    const generated = [...buildCapacityNudges(ownerId, relationships.map(mapMembership)), ...buildInactivityNudges(ownerId, relationships.map(mapMembership))];

    for (const nudge of generated) {
      await this.db
        .insert(nudges)
        .values({
          id: nudge.id,
          ownerId: nudge.ownerId,
          type: nudge.type,
          title: nudge.title,
          body: nudge.body,
          acknowledgedAt: null,
          createdAt: new Date(nudge.createdAt),
        })
        .onConflictDoNothing();
    }

    const rows = await this.db.select().from(nudges).where(eq(nudges.ownerId, ownerId)).orderBy(desc(nudges.createdAt));
    return rows.map(mapNudge);
  }

  async acknowledgeNudge(ownerId: string, nudgeId: string) {
    const [updated] = await this.db
      .update(nudges)
      .set({ acknowledgedAt: new Date() })
      .where(and(eq(nudges.id, nudgeId), eq(nudges.ownerId, ownerId)))
      .returning();

    if (!updated) {
      throw new AppError(404, "Nudge not found.");
    }

    return mapNudge(updated);
  }

  private async ensureUserFromIdentifier(identifier: string): Promise<UserProfile> {
    const [local] = await this.db
      .select()
      .from(users)
      .where(or(eq(users.id, identifier), eq(users.did, identifier), eq(users.handle, identifier)));

    if (local) {
      return mapUser(local);
    }

    const actor = await this.atproto.getActor(identifier);
    return this.upsertUser({
      ...actor,
      provider: "atproto",
    });
  }

  private async requirePostVisibleToUser(postId: string, viewerId: string): Promise<Post> {
    const [post] = await this.db.select().from(posts).where(eq(posts.id, postId));
    if (!post) {
      throw new AppError(404, "Post not found.");
    }

    const [recipient] = await this.db
      .select()
      .from(postRecipients)
      .where(and(eq(postRecipients.postId, postId), eq(postRecipients.recipientId, viewerId)));
    if (!recipient && post.authorId !== viewerId) {
      throw new AppError(403, "You cannot interact with that post.");
    }

    const [blocked] = await this.db
      .select()
      .from(blocks)
      .where(
        or(
          and(eq(blocks.ownerId, viewerId), eq(blocks.blockedUserId, post.authorId)),
          and(eq(blocks.ownerId, post.authorId), eq(blocks.blockedUserId, viewerId)),
        ),
      );
    if (blocked) {
      throw new AppError(403, "This post is unavailable.");
    }

    return mapPost(post);
  }

  private async markMeaningfulInteraction(userA: string, userB: string) {
    await this.db
      .update(memberships)
      .set({ lastMeaningfulInteractionAt: new Date() })
      .where(
        or(
          and(eq(memberships.ownerId, userA), eq(memberships.memberId, userB)),
          and(eq(memberships.ownerId, userB), eq(memberships.memberId, userA)),
        ),
      );
  }

  private async seedWelcomePost(ownerId: string, memberId: string, tier: TierId) {
    const existing = ((await this.db.select().from(posts).where(eq(posts.authorId, memberId))) as PostRow[]).filter((post: PostRow) =>
      post.body.startsWith(`Welcome to my ${tier}`),
    );
    if (existing.length > 0) {
      return;
    }

    const [created] = await this.db
      .insert(posts)
      .values({
        id: createId("post"),
        authorId: memberId,
        audience: tier,
        body: `Welcome to my ${tier} circle. This is where I share the quieter stuff.`,
        photoUrl: null,
        createdAt: new Date(),
      })
      .returning();
    const createdPost = ensurePresent(created);

    await this.db.insert(postRecipients).values({
      id: createId("recipient"),
      postId: createdPost.id,
      recipientId: ownerId,
      audience: tier,
    });
  }

  private async getBlockedPairIds(viewerId: string): Promise<string[]> {
    const records = ((await this.db
      .select()
      .from(blocks)
      .where(or(eq(blocks.ownerId, viewerId), eq(blocks.blockedUserId, viewerId)))) as BlockRow[]);
    return records.flatMap((record: BlockRow) => [record.ownerId, record.blockedUserId]);
  }
}

function mapUser(row: UserRow): UserProfile {
  return {
    id: row.id,
    did: row.did,
    handle: row.handle,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl ?? null,
    bio: row.bio ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapMembership(row: MembershipRow): TierMembership {
  return {
    id: row.id,
    ownerId: row.ownerId,
    memberId: row.memberId,
    tier: row.tier,
    createdAt: row.createdAt.toISOString(),
    lastMeaningfulInteractionAt: row.lastMeaningfulInteractionAt?.toISOString() ?? null,
  };
}

function mapPost(row: PostRow): Post {
  return {
    id: row.id,
    authorId: row.authorId,
    audience: row.audience,
    body: row.body,
    photoUrl: row.photoUrl ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapComment(row: CommentRow) {
  return {
    id: row.id,
    postId: row.postId,
    authorId: row.authorId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapReaction(row: ReactionRow) {
  return {
    id: row.id,
    postId: row.postId,
    authorId: row.authorId,
    emoji: row.emoji,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapBlock(row: BlockRow): Block {
  return {
    id: row.id,
    ownerId: row.ownerId,
    blockedUserId: row.blockedUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapMute(row: MuteRow): Mute {
  return {
    id: row.id,
    ownerId: row.ownerId,
    mutedUserId: row.mutedUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapNudge(row: NudgeRow): Nudge {
  return {
    id: row.id,
    ownerId: row.ownerId,
    type: row.type,
    title: row.title,
    body: row.body,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function ensurePresent<T>(value: T | undefined | null, message = "Expected a database record."): T {
  if (value == null) {
    throw new AppError(500, message);
  }

  return value;
}
