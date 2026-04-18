import { useSessionStore } from "../state/session";

export function useSession() {
  return useSessionStore();
}
