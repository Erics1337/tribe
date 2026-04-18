function getSchemeFromRedirectUri(redirectUri: string | undefined): string {
  if (!redirectUri) {
    return "tribe";
  }

  const match = redirectUri.match(/^([A-Za-z][A-Za-z0-9+.-]*):/);
  return match?.[1] ?? "tribe";
}

const atprotoClientId = process.env.EXPO_PUBLIC_ATPROTO_CLIENT_ID;
const atprotoClientUri = process.env.EXPO_PUBLIC_ATPROTO_CLIENT_URI;
const atprotoRedirectUri = process.env.EXPO_PUBLIC_ATPROTO_REDIRECT_URI;

const extra = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:4000",
  atprotoHandleResolver: process.env.EXPO_PUBLIC_ATPROTO_HANDLE_RESOLVER ?? "https://bsky.social",
  atprotoScope:
    process.env.EXPO_PUBLIC_ATPROTO_SCOPE ?? "atproto repo:* rpc:*?aud=did:web:api.bsky.app#bsky_appview",
  atprotoSignInInput: process.env.EXPO_PUBLIC_ATPROTO_SIGN_IN_INPUT ?? "https://bsky.social",
  ...(atprotoClientId ? { atprotoClientId } : {}),
  ...(atprotoClientUri ? { atprotoClientUri } : {}),
  ...(atprotoRedirectUri ? { atprotoRedirectUri } : {}),
};

export default {
  expo: {
    name: "Tribe",
    slug: "tribe",
    scheme: getSchemeFromRedirectUri(atprotoRedirectUri),
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    plugins: ["expo-router", "expo-dev-client", "expo-secure-store"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.tribe.app",
    },
    android: {
      package: "com.tribe.app",
    },
    extra,
  },
};
