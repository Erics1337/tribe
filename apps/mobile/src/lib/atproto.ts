import { isRunningInExpoGo, requireOptionalNativeModule } from "expo";
import { config } from "./config";
import { atprotoIdentityResolver } from "./atproto-identity-resolver";

type AtprotoIdentity = {
  did: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
};

type AtprotoAvailability = {
  available: boolean;
  reason?: string;
};

function getMissingOAuthConfig(): string[] {
  return [
    !config.atprotoClientId ? "EXPO_PUBLIC_ATPROTO_CLIENT_ID" : null,
    !config.atprotoClientUri ? "EXPO_PUBLIC_ATPROTO_CLIENT_URI" : null,
    !config.atprotoRedirectUri ? "EXPO_PUBLIC_ATPROTO_REDIRECT_URI" : null,
  ].filter((value): value is string => Boolean(value));
}

function getClientMetadata() {
  const missingConfig = getMissingOAuthConfig();
  if (missingConfig.length > 0) {
    throw new Error(`Missing AT Protocol OAuth config: ${missingConfig.join(", ")}.`);
  }

  return {
    client_id: config.atprotoClientId!,
    client_name: "Tribe",
    client_uri: config.atprotoClientUri!,
    redirect_uris: [config.atprotoRedirectUri!],
    scope: config.atprotoScope,
    token_endpoint_auth_method: "none",
    response_types: ["code"],
    grant_types: ["authorization_code", "refresh_token"],
    application_type: "native",
    dpop_bound_access_tokens: true,
  };
}

export function getAtprotoSignInAvailability(): AtprotoAvailability {
  if (isRunningInExpoGo()) {
    return {
      available: false,
      reason: "AT Protocol sign-in needs a native development build. Run pnpm dev:ios:native instead of Expo Go.",
    };
  }

  const nativeModule = requireOptionalNativeModule("ExpoAtprotoOAuthClient");
  if (!nativeModule) {
    return {
      available: false,
      reason: "AT Protocol sign-in is not linked into this client yet. Rebuild the iOS app with pnpm dev:ios:native.",
    };
  }

  const missingConfig = getMissingOAuthConfig();
  if (missingConfig.length > 0) {
    return {
      available: false,
      reason: `Configure ${missingConfig.join(", ")} in apps/mobile/.env before using AT Protocol OAuth.`,
    };
  }

  return { available: true };
}

export async function signInWithAtproto(input?: string): Promise<AtprotoIdentity> {
  const availability = getAtprotoSignInAvailability();
  if (!availability.available) {
    throw new Error(availability.reason ?? "AT Protocol sign-in is unavailable.");
  }

  const [{ ExpoOAuthClient }, { Agent }] = await Promise.all([import("@atproto/oauth-client-expo"), import("@atproto/api")]);
  if (typeof ExpoOAuthClient !== "function") {
    throw new Error("AT Protocol OAuth client package is installed but did not expose ExpoOAuthClient.");
  }

  const client = new ExpoOAuthClient({
    handleResolver: config.atprotoHandleResolver,
    identityResolver: atprotoIdentityResolver,
    clientMetadata: getClientMetadata(),
  });

  const session = await client.signIn(input?.trim() || config.atprotoSignInInput);
  const agent = new Agent(session);
  const profile = await agent.getProfile({ actor: session.did });

  return {
    did: session.did,
    handle: profile.data.handle,
    displayName: profile.data.displayName ?? profile.data.handle,
    avatarUrl: profile.data.avatar ?? null,
  };
}
