import { describe, expect, it } from "vitest";
import { buildAudienceSnapshot, assertTierCapacity, buildCapacityNudges } from "./domain";

describe("domain helpers", () => {
  it("enforces tier capacity", () => {
    expect(() => assertTierCapacity(5, "inner")).toThrow(/capacity/);
  });

  it("builds an audience snapshot from memberships", () => {
    const recipients = buildAudienceSnapshot(
      {
        id: "post-1",
        authorId: "owner-1",
        audience: "close",
        body: "Hi",
        createdAt: new Date().toISOString(),
      },
      [
        {
          id: "membership-1",
          ownerId: "owner-1",
          memberId: "user-a",
          tier: "close",
          createdAt: new Date().toISOString(),
        },
        {
          id: "membership-2",
          ownerId: "owner-1",
          memberId: "user-b",
          tier: "tribe",
          createdAt: new Date().toISOString(),
        },
      ],
    );

    expect(recipients).toEqual([{ recipientId: "user-a", audience: "close" }]);
  });

  it("creates a capacity nudge at the threshold", () => {
    const nudges = buildCapacityNudges(
      "owner-1",
      Array.from({ length: 4 }).map((_, index) => ({
        id: `membership-${index}`,
        ownerId: "owner-1",
        memberId: `member-${index}`,
        tier: "inner" as const,
        createdAt: new Date().toISOString(),
      })),
    );

    expect(nudges[0]?.type).toBe("capacity");
  });
});
