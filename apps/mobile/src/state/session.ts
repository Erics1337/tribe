import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import type { UserProfile } from "@tribe/shared";
import { api } from "../lib/api";

const SESSION_KEY = "tribe-session";

type SessionStatus = "loading" | "signedOut" | "signedIn";

type SessionState = {
  status: SessionStatus;
  token?: string;
  user?: UserProfile;
  needsOnboarding: boolean;
  error?: string;
  bootstrap: () => Promise<void>;
  signInDemo: (profile: { handle: string; displayName: string }) => Promise<void>;
  signInAtproto: (identity: { did: string; handle: string; displayName: string; avatarUrl?: string | null }) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setNeedsOnboarding: (value: boolean) => void;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  status: "loading",
  needsOnboarding: false,
  async bootstrap() {
    const token = await SecureStore.getItemAsync(SESSION_KEY);
    if (!token) {
      set({ status: "signedOut", token: undefined, user: undefined, needsOnboarding: false });
      return;
    }

    try {
      const response = await api.getMe(token);
      set({
        status: "signedIn",
        token,
        user: response.user,
        needsOnboarding: response.needsOnboarding,
        error: undefined,
      });
    } catch (error) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      set({
        status: "signedOut",
        token: undefined,
        user: undefined,
        needsOnboarding: false,
        error: error instanceof Error ? error.message : "Unable to restore session.",
      });
    }
  },
  async signInDemo(profile) {
    const response = await api.createSession({
      did: `did:demo:${profile.handle}`,
      handle: profile.handle,
      displayName: profile.displayName,
      provider: "demo",
    });
    await SecureStore.setItemAsync(SESSION_KEY, response.token);
    set({
      status: "signedIn",
      token: response.token,
      user: response.user,
      needsOnboarding: response.needsOnboarding,
      error: undefined,
    });
  },
  async signInAtproto(identity) {
    const response = await api.createSession({
      ...identity,
      provider: "atproto",
    });
    await SecureStore.setItemAsync(SESSION_KEY, response.token);
    set({
      status: "signedIn",
      token: response.token,
      user: response.user,
      needsOnboarding: response.needsOnboarding,
      error: undefined,
    });
  },
  async refresh() {
    const token = get().token;
    if (!token) {
      set({ status: "signedOut", user: undefined });
      return;
    }
    const response = await api.getMe(token);
    set({
      status: "signedIn",
      token,
      user: response.user,
      needsOnboarding: response.needsOnboarding,
      error: undefined,
    });
  },
  async signOut() {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    set({
      status: "signedOut",
      token: undefined,
      user: undefined,
      needsOnboarding: false,
      error: undefined,
    });
  },
  setNeedsOnboarding(value) {
    set({ needsOnboarding: value });
  },
}));
