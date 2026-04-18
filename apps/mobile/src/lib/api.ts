import type {
  FeedPage,
  Nudge,
  TierId,
  UserProfile,
} from "@tribe/shared";
import { config } from "./config";

type SessionResponse = {
  token: string;
  user: UserProfile;
  needsOnboarding: boolean;
};

type MeResponse = {
  user: UserProfile;
  needsOnboarding: boolean;
};

async function apiFetch<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ message: "Request failed." }))) as { message?: string };
    throw new Error(errorBody.message ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  createSession: (payload: {
    did: string;
    handle: string;
    displayName: string;
    avatarUrl?: string | null;
    bio?: string | null;
    provider: "demo" | "atproto";
    providerToken?: string;
  }) => apiFetch<SessionResponse>("/auth/session", { method: "POST", body: JSON.stringify(payload) }),
  getMe: (token: string) => apiFetch<MeResponse>("/auth/me", { token }),
  updateProfile: (token: string, payload: { displayName: string; bio?: string | null; avatarUrl?: string | null }) =>
    apiFetch<UserProfile>("/profile", { token, method: "PATCH", body: JSON.stringify(payload) }),
  searchUsers: (token: string, query: string) =>
    apiFetch<UserProfile[]>(`/users/search?q=${encodeURIComponent(query)}`, { token }),
  listRelationships: (token: string) =>
    apiFetch<Array<{ id: string; ownerId: string; memberId: string; tier: TierId; createdAt: string; member: UserProfile }>>("/relationships", { token }),
  createRelationship: (token: string, payload: { memberId: string; tier: TierId }) =>
    apiFetch("/relationships", { token, method: "POST", body: JSON.stringify(payload) }),
  moveRelationship: (token: string, membershipId: string, tier: TierId) =>
    apiFetch(`/relationships/${membershipId}`, { token, method: "PATCH", body: JSON.stringify({ tier }) }),
  listFeed: (token: string, tier: TierId, cursor?: string | null) =>
    apiFetch<FeedPage>(`/feed?tier=${tier}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { token }),
  createPost: (token: string, payload: { audience: TierId; body: string; photoUrl?: string | null }) =>
    apiFetch("/posts", { token, method: "POST", body: JSON.stringify(payload) }),
  createComment: (token: string, payload: { postId: string; body: string }) =>
    apiFetch("/comments", { token, method: "POST", body: JSON.stringify(payload) }),
  createReaction: (token: string, payload: { postId: string; emoji: string }) =>
    apiFetch("/reactions", { token, method: "POST", body: JSON.stringify(payload) }),
  createBlock: (token: string, blockedUserId: string) =>
    apiFetch("/blocks", { token, method: "POST", body: JSON.stringify({ blockedUserId }) }),
  createMute: (token: string, mutedUserId: string) =>
    apiFetch("/mutes", { token, method: "POST", body: JSON.stringify({ mutedUserId }) }),
  listNudges: (token: string) => apiFetch<Nudge[]>("/nudges", { token }),
  acknowledgeNudge: (token: string, nudgeId: string) =>
    apiFetch<Nudge>("/nudges/acknowledge", { token, method: "POST", body: JSON.stringify({ nudgeId }) }),
};
