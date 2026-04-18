import type { IdentityInfo, IdentityResolver, ResolveIdentityOptions } from "@atproto-labs/identity-resolver";
import type { AtprotoDidDocument } from "@atproto-labs/did-resolver";
import { config } from "./config";

type ResolveDidResponse = {
  didDoc: AtprotoDidDocument;
};

type ResolveHandleResponse = {
  did: string;
};

const PUBLIC_API_URL = "https://public.api.bsky.app";
const BSKY_SOCIAL_URL = "https://bsky.social";
const PLC_DIRECTORY_URL = "https://plc.directory";
const HANDLE_INVALID = "handle.invalid";

function extractHandleFromDidDoc(didDoc: AtprotoDidDocument): string {
  const handle = didDoc.alsoKnownAs?.find((value) => value.startsWith("at://"))?.slice(5);
  return handle ?? HANDLE_INVALID;
}

async function fetchJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    signal,
  });

  const rawText = await response.text().catch(() => "");
  const parsed = rawText ? (JSON.parse(rawText) as { error?: string; message?: string } & T) : undefined;

  if (!response.ok) {
    throw new Error(
      parsed?.message ??
        parsed?.error ??
        (rawText || `Resolver returned ${response.status} from ${url.origin}.`),
    );
  }

  return parsed as T;
}

async function resolveDid(did: string, signal?: AbortSignal): Promise<IdentityInfo> {
  const plcUrl = new URL(`/${encodeURIComponent(did)}`, PLC_DIRECTORY_URL);
  console.log(`[atproto] resolving DID ${did} via ${plcUrl.origin}`);

  const didDoc = await fetchJson<AtprotoDidDocument>(plcUrl, signal);

  return {
    did: did as IdentityInfo["did"],
    didDoc,
    handle: extractHandleFromDidDoc(didDoc),
  };
}

async function resolveHandle(handle: string, signal?: AbortSignal): Promise<IdentityInfo> {
  const hosts = [BSKY_SOCIAL_URL, PUBLIC_API_URL];
  const failures: string[] = [];

  for (const host of hosts) {
    try {
      const resolveHandleUrl = new URL("/xrpc/com.atproto.identity.resolveHandle", host);
      resolveHandleUrl.searchParams.set("handle", handle);
      console.log(`[atproto] resolving handle ${handle} via ${host}`);
      const body = await fetchJson<ResolveHandleResponse>(resolveHandleUrl, signal);
      return await resolveDid(body.did, signal);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[atproto] handle resolution failed via ${host}: ${message}`);
      failures.push(`${host}: ${message}`);
    }
  }

  throw new Error(`Failed to resolve handle: ${handle} (${failures.join(" | ")})`);
}

export const atprotoIdentityResolver: IdentityResolver = {
  async resolve(identifier: string, options?: ResolveIdentityOptions): Promise<IdentityInfo> {
    if (identifier.startsWith("did:")) {
      return resolveDid(identifier, options?.signal);
    }

    return resolveHandle(identifier, options?.signal);
  },
};
