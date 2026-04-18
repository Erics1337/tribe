import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text } from "react-native";
import { Button, Card, Heading, Screen } from "../../src/components/primitives";
import { useSession } from "../../src/hooks/use-session";
import { api } from "../../src/lib/api";
import { palette, spacing } from "../../src/theme/tokens";

export default function InboxScreen() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const nudgesQuery = useQuery({
    queryKey: ["nudges"],
    queryFn: () => api.listNudges(token!),
    enabled: Boolean(token),
  });

  const acknowledge = useMutation({
    mutationFn: (nudgeId: string) => api.acknowledgeNudge(token!, nudgeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nudges"] });
    },
  });

  return (
    <Screen>
      <Heading title="Inbox" subtitle="Reflective prompts, not growth hacks." />
      <ScrollView showsVerticalScrollIndicator={false}>
        {(nudgesQuery.data ?? []).map((nudge) => (
          <Card key={nudge.id}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: palette.ink }}>{nudge.title}</Text>
            <Text style={{ color: palette.dusk, marginTop: spacing.xs, marginBottom: spacing.md }}>{nudge.body}</Text>
            <Button
              label={nudge.acknowledgedAt ? "Acknowledged" : "Acknowledge"}
              onPress={() => acknowledge.mutate(nudge.id)}
              tone={nudge.acknowledgedAt ? "secondary" : "primary"}
              disabled={Boolean(nudge.acknowledgedAt)}
            />
          </Card>
        ))}
        {!nudgesQuery.data?.length ? <Text style={{ color: palette.dusk }}>No nudges right now.</Text> : null}
      </ScrollView>
    </Screen>
  );
}
