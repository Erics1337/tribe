import Constants from "expo-constants";

type ExpoConfig = {
  apiBaseUrl?: string;
  atprotoClientId?: string;
  atprotoClientUri?: string;
  atprotoRedirectUri?: string;
  atprotoHandleResolver?: string;
  atprotoScope?: string;
  atprotoSignInInput?: string;
};

const expoConfig = (Constants.expoConfig?.extra ?? {}) as ExpoConfig;

export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? expoConfig.apiBaseUrl ?? "http://127.0.0.1:4000",
  atprotoClientId: process.env.EXPO_PUBLIC_ATPROTO_CLIENT_ID ?? expoConfig.atprotoClientId,
  atprotoClientUri: process.env.EXPO_PUBLIC_ATPROTO_CLIENT_URI ?? expoConfig.atprotoClientUri,
  atprotoRedirectUri: process.env.EXPO_PUBLIC_ATPROTO_REDIRECT_URI ?? expoConfig.atprotoRedirectUri,
  atprotoHandleResolver:
    process.env.EXPO_PUBLIC_ATPROTO_HANDLE_RESOLVER ?? expoConfig.atprotoHandleResolver ?? "https://bsky.social",
  atprotoScope:
    process.env.EXPO_PUBLIC_ATPROTO_SCOPE ??
    expoConfig.atprotoScope ??
    "atproto repo:* rpc:*?aud=did:web:api.bsky.app#bsky_appview",
  atprotoSignInInput:
    process.env.EXPO_PUBLIC_ATPROTO_SIGN_IN_INPUT ?? expoConfig.atprotoSignInInput ?? "https://bsky.social",
};
