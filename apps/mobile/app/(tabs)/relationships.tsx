import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { TIER_ORDER, type TierId } from "@tribe/shared";
import { Button, Card, Field, Heading, Pill, Screen } from "../../src/components/primitives";
import { useSession } from "../../src/hooks/use-session";
import { api } from "../../src/lib/api";
import { palette, spacing } from "../../src/theme/tokens";

export default function RelationshipsScreen() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<TierId>("tribe");

  const relationshipsQuery = useQuery({
    queryKey: ["relationships"],
    queryFn: () => api.listRelationships(token!),
    enabled: Boolean(token),
  });

  const searchQuery = useQuery({
    queryKey: ["search", "relationships", query],
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

  const moveRelationship = useMutation({
    mutationFn: ({ membershipId, tier }: { membershipId: string; tier: TierId }) => api.moveRelationship(token!, membershipId, tier),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["relationships"] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: (blockedUserId: string) => api.createBlock(token!, blockedUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["relationships"] });
    },
  });

  const muteMutation = useMutation({
    mutationFn: (mutedUserId: string) => api.createMute(token!, mutedUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  return (
    <Screen>
      <Heading title="Your circles" subtitle="Keep the graph private, move people gently, and protect the quieter layers." />
      <Card>
        <Field value={query} onChangeText={setQuery} placeholder="Search by handle or name" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
          {TIER_ORDER.map((tier) => (
            <Pill key={tier} label={tier} active={selectedTier === tier} onPress={() => setSelectedTier(tier)} />
          ))}
        </View>
      </Card>
      <ScrollView showsVerticalScrollIndicator={false}>
        {(searchQuery.data ?? []).map((person) => (
          <Card key={person.id}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: palette.ink }}>{person.displayName}</Text>
            <Text style={{ color: palette.dusk, marginBottom: spacing.sm }}>@{person.handle}</Text>
            <Button label={`Add to ${selectedTier}`} onPress={() => createRelationship.mutate(person.id)} />
          </Card>
        ))}
        {(relationshipsQuery.data ?? []).map((relationship) => (
          <Card key={relationship.id}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: palette.ink }}>{relationship.member.displayName}</Text>
            <Text style={{ color: palette.dusk, marginBottom: spacing.sm }}>@{relationship.member.handle}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm }}>
              {TIER_ORDER.map((tier) => (
                <Pill
                  key={tier}
                  label={tier}
                  active={relationship.tier === tier}
                  onPress={() => moveRelationship.mutate({ membershipId: relationship.id, tier })}
                />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button label="Mute" onPress={() => muteMutation.mutate(relationship.memberId)} tone="secondary" />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Block" onPress={() => blockMutation.mutate(relationship.memberId)} />
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
