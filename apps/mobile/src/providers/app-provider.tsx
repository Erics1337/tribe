import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { palette } from "../theme/tokens";
import { useSessionStore } from "../state/session";

const queryClient = new QueryClient();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const bootstrap = useSessionStore((state) => state.bootstrap);
  const status = useSessionStore((state) => state.status);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (status === "loading") {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            backgroundColor: palette.paper,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color={palette.ember} size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}
