import "../src/lib/abort-signal-polyfill";
import "expo-dev-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "../src/providers/app-provider";

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#fffdf8" },
        }}
      />
    </AppProvider>
  );
}
