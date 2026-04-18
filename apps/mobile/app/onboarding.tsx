import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { TIER_CAPS, TIER_ORDER, type TierId } from "@tribe/shared";
import { Button, Card, Field, Heading, Pill, Screen } from "../src/components/primitives";
import { useSession } from "../src/hooks/use-session";
import { api } from "../src/lib/api";
import { palette, spacing } from "../src/theme/tokens";

export default function OnboardingScreen() {
  const { token, setNeedsOnboarding } = useSession();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<TierId>("inner");

  const relationshipsQuery = useQuery({
    queryKey: ["relationships"],
    queryFn: () => api.listRelationships(token!),
    enabled: Boolean(token),
  });

  const searchQuery = useQuery({
    queryKey: ["search", query],
    queryFn: () => api.searchUsers(token!, query),
    enabled: Boolean(token) && query.trim().length > 1,
  });

  const createRelationship = useMutation({
    mutationFn: (memberId: string) => api.createRelationship(token!, { memberId, tier: selectedTier }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["relationships"] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const counts = useMemo(() => {
    const base = {
      inner: 0,
      close: 0,
      tribe: 0,
      village: 0,
    };
    for (const relationship of relationshipsQuery.data ?? []) {
      base[relationship.tier] += 1;
    }
    return base;
  }, [relationshipsQuery.data]);

  const canContinue = (relationshipsQuery.data?.length ?? 0) > 0;

  return (
    <Screen>
      <Heading title="Shape your circles" subtitle="Tribe works better when the first feed already feels like your real social world." />
      <Card>
        <Text style={{ color: palette.dusk, marginBottom: spacing.sm }}>Search by handle or name, then choose the circle that fits.</Text>
        <Field value={query} onChangeText={setQuery} placeholder="Search your people" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
          {TIER_ORDER.map((tier) => (
            <Pill key={tier} label={`${tier} (${counts[tier]}/${TIER_CAPS[tier]})`} active={selectedTier === tier} onPress={() => setSelectedTier(tier)} />
          ))}
        </View>
      </Card>
      <ScrollView showsVerticalScrollIndicator={false}>
        {(searchQuery.data ?? []).map((person) => (
          <Card key={person.id}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: palette.ink }}>{person.displayName}</Text>
            <Text style={{ color: palette.dusk, marginBottom: spacing.sm }}>@{person.handle}</Text>
            {person.bio ? <Text style={{ color: palette.ink, marginBottom: spacing.sm }}>{person.bio}</Text> : null}
            <Button label={`Add to ${selectedTier}`} onPress={() => createRelationship.mutate(person.id)} />
          </Card>
        ))}
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "700", color: palette.ink, marginBottom: spacing.sm }}>Current setup</Text>
          {(relationshipsQuery.data ?? []).map((relationship) => (
            <View
              key={relationship.id}
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}
            >
              <Text style={{ color: palette.ink }}>{relationship.member.displayName}</Text>
              <Pill label={relationship.tier} active />
            </View>
          ))}
          {!relationshipsQuery.data?.length ? <Text style={{ color: palette.dusk }}>Add at least one person to continue.</Text> : null}
        </Card>
        <Button
          label="Finish onboarding"
          disabled={!canContinue}
          onPress={() => {
            setNeedsOnboarding(false);
            router.replace("/");
          }}
        />
      </ScrollView>
    </Screen>
  );
}
