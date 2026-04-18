import { PAGE_SIZE, TIER_CAPS, TIER_ORDER } from "./constants";
import type {
  Audience,
  FeedItem,
  Nudge,
  Post,
  PostRecipient,
  TierId,
  TierMembership,
} from "./types";

export function getTierCap(tier: TierId): number {
  return TIER_CAPS[tier];
}

export function assertTierCapacity(count: number, tier: TierId): void {
  if (count >= getTierCap(tier)) {
    throw new Error(`${tier} tier is at capacity.`);
  }
}

export function buildAudienceSnapshot(
  post: Post,
  memberships: TierMembership[],
): Pick<PostRecipient, "recipientId" | "audience">[] {
  if (post.audience === "broadcast") {
    return memberships.map((membership) => ({
      recipientId: membership.memberId,
      audience: post.audience,
    }));
  }

  return memberships
    .filter((membership) => membership.tier === post.audience)
    .map((membership) => ({
      recipientId: membership.memberId,
      audience: post.audience,
    }));
}

export function paginateFeed(items: FeedItem[], cursor?: string | null, limit = PAGE_SIZE) {
  const startIndex = cursor ? items.findIndex((item) => item.post.id === cursor) + 1 : 0;
  const pageItems = items.slice(startIndex, startIndex + limit);
  const nextCursor = pageItems.length === limit ? pageItems[pageItems.length - 1]?.post.id : null;

  return {
    items: pageItems,
    nextCursor,
  };
}

export function buildCapacityNudges(ownerId: string, memberships: TierMembership[]): Nudge[] {
  const counts = TIER_ORDER.reduce<Record<TierId, number>>(
    (accumulator, tier) => ({
      ...accumulator,
      [tier]: memberships.filter((membership) => membership.tier === tier).length,
    }),
    {
      inner: 0,
      close: 0,
      tribe: 0,
      village: 0,
    },
  );

  return TIER_ORDER.flatMap((tier) => {
    const count = counts[tier];
    const cap = getTierCap(tier);
    if (count < cap - 1) {
      return [];
    }

    return [
      {
        id: `capacity-${ownerId}-${tier}`,
        ownerId,
        type: "capacity" as const,
        title: `${capitalize(tier)} is almost full`,
        body: `${count} of ${cap} seats are taken. Review who still belongs here before you add someone new.`,
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
      },
    ];
  });
}

export function buildInactivityNudges(ownerId: string, memberships: TierMembership[]): Nudge[] {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;

  return memberships
    .filter((membership) => {
      const timestamp = membership.lastMeaningfulInteractionAt ?? membership.createdAt;
      return new Date(timestamp).getTime() < cutoff;
    })
    .slice(0, 5)
    .map((membership) => ({
      id: `inactivity-${membership.id}`,
      ownerId,
      type: "inactivity" as const,
      title: "Time for a relationship review",
      body: "Someone in your circles has gone quiet for a while. Consider whether their current tier still fits.",
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
    }));
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
