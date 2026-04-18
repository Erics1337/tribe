import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../server";

let server: Awaited<ReturnType<typeof createServer>>;

async function signIn(handle: string) {
  const response = await server.inject({
    method: "POST",
    url: "/auth/session",
    payload: {
      did: `did:demo:${handle}`,
      handle,
      displayName: handle,
      provider: "demo",
    },
  });
  const body = response.json();
  return {
    token: body.token as string,
    user: body.user as { id: string },
  };
}

beforeAll(async () => {
  server = await createServer();
});

afterAll(async () => {
  if (server) {
    await server.close();
  }
});

describe("Tribe API", () => {
  it("creates a session and onboarding state", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/auth/session",
      payload: {
        did: "did:demo:tester",
        handle: "tester.tribe.test",
        displayName: "Tester",
        provider: "demo",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().needsOnboarding).toBe(true);
  });

  it("creates relationships, posts, and lists feed items", async () => {
    const viewer = await signIn("viewer.tribe.test");

    const search = await server.inject({
      method: "GET",
      url: "/users/search?q=sophia",
      headers: {
        authorization: `Bearer ${viewer.token}`,
      },
    });
    const sophia = search.json()[0] as { id: string };

    await server.inject({
      method: "POST",
      url: "/relationships",
      headers: {
        authorization: `Bearer ${viewer.token}`,
      },
      payload: {
        memberId: sophia.id,
        tier: "inner",
      },
    });

    const feed = await server.inject({
      method: "GET",
      url: "/feed?tier=inner",
      headers: {
        authorization: `Bearer ${viewer.token}`,
      },
    });

    expect(feed.statusCode).toBe(200);
    expect(feed.json().items.length).toBeGreaterThan(0);
  });

  it("hides blocked authors from the feed", async () => {
    const viewer = await signIn("blocker.tribe.test");

    const search = await server.inject({
      method: "GET",
      url: "/users/search?q=marco",
      headers: {
        authorization: `Bearer ${viewer.token}`,
      },
    });
    const marco = search.json()[0] as { id: string };

    await server.inject({
      method: "POST",
      url: "/relationships",
      headers: {
        authorization: `Bearer ${viewer.token}`,
      },
      payload: {
        memberId: marco.id,
        tier: "close",
      },
    });

    const before = await server.inject({
      method: "GET",
      url: "/feed?tier=close",
      headers: {
        authorization: `Bearer ${viewer.token}`,
      },
    });
    expect(before.json().items.length).toBeGreaterThan(0);

    await server.inject({
      method: "POST",
      url: "/blocks",
      headers: {
        authorization: `Bearer ${viewer.token}`,
      },
      payload: {
        blockedUserId: marco.id,
      },
    });

    const after = await server.inject({
      method: "GET",
      url: "/feed?tier=close",
      headers: {
        authorization: `Bearer ${viewer.token}`,
      },
    });
    expect(after.json().items.length).toBe(0);
  });
});
