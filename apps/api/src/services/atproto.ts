import { BskyAgent } from "@atproto/api";
import type { AppEnv } from "../env";

export type IdentityPayload = {
  did: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  provider: "demo" | "atproto";
  providerToken?: string;
};

export class AtprotoDirectoryService {
  private agent: BskyAgent;

  constructor(private readonly env: AppEnv) {
    this.agent = new BskyAgent({ service: env.ATPROTO_SERVICE_URL });
  }

  async verifyIdentity(payload: IdentityPayload): Promise<IdentityPayload> {
    if (payload.provider === "demo") {
      return payload;
    }

    if (!payload.did.startsWith("did:")) {
      throw new Error("AT Protocol identity must include a DID.");
    }

    return payload;
  }

  async searchActors(query: string): Promise<
    Array<{
      did: string;
      handle: string;
      displayName: string;
      avatarUrl?: string | null;
      bio?: string | null;
    }>
  > {
    if (!query.trim()) {
      return [];
    }

    const response = await this.agent.searchActorsTypeahead({ q: query.trim(), limit: 8 });
    return response.data.actors.map((actor) => ({
      did: actor.did,
      handle: actor.handle,
      displayName: actor.displayName ?? actor.handle,
      avatarUrl: actor.avatar ?? null,
      bio: null,
    }));
  }

  async getActor(identifier: string) {
    const response = await this.agent.getProfile({ actor: identifier });
    return {
      did: response.data.did,
      handle: response.data.handle,
      displayName: response.data.displayName ?? response.data.handle,
      avatarUrl: response.data.avatar ?? null,
      bio: response.data.description ?? null,
    };
  }
}
