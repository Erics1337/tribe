import { Tabs } from "expo-router";
import { palette } from "../../src/theme/tokens";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.ember,
        tabBarInactiveTintColor: palette.dusk,
        tabBarStyle: {
          backgroundColor: palette.paper,
          borderTopColor: palette.line,
        },
      }}
    >
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
      <Tabs.Screen name="relationships" options={{ title: "Circles" }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
