import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { TIER_ORDER, type TierId } from "@tribe/shared";
import { Button, Heading, Pill, Screen } from "../../src/components/primitives";
import { FeedCard } from "../../src/features/feed/feed-card";
import { useSession } from "../../src/hooks/use-session";
import { api } from "../../src/lib/api";
import { palette, spacing } from "../../src/theme/tokens";

export default function FeedScreen() {
  const { token } = useSession();
  const [tier, setTier] = useState<TierId>("inner");
  const feedQuery = useQuery({
    queryKey: ["feed", tier],
    queryFn: () => api.listFeed(token!, tier),
    enabled: Boolean(token),
  });

  return (
    <Screen>
      <Heading title="Your quiet feed" subtitle="Small circles, clear context, no endless scroll." />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
        {TIER_ORDER.map((entry) => (
          <Pill key={entry} label={entry} active={entry === tier} onPress={() => setTier(entry)} />
        ))}
      </View>
      <FlatList
        data={feedQuery.data?.items ?? []}
        keyExtractor={(item) => item.post.id}
        renderItem={({ item }) => <FeedCard item={item} tier={tier} />}
        ListEmptyComponent={<Text style={{ color: palette.dusk }}>Your {tier} feed is quiet right now. Add people or post first.</Text>}
        showsVerticalScrollIndicator={false}
      />
      <View style={{ paddingVertical: spacing.md }}>
        <Button label="Compose" onPress={() => router.push("/compose")} />
      </View>
    </Screen>
  );
}
