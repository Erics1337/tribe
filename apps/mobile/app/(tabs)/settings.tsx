import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Button, Card, Field, Heading, Screen } from "../../src/components/primitives";
import { useSession } from "../../src/hooks/use-session";
import { api } from "../../src/lib/api";
import { palette, spacing } from "../../src/theme/tokens";

export default function SettingsScreen() {
  const { token, user, signOut, refresh } = useSession();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");

  const updateProfile = useMutation({
    mutationFn: () => api.updateProfile(token!, { displayName, bio }),
    onSuccess: async () => {
      await refresh();
    },
  });

  return (
    <Screen>
      <Heading title="Settings" subtitle="Your identity is portable. Your circles remain private." />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "700", color: palette.ink }}>{user?.displayName}</Text>
          <Text style={{ color: palette.dusk, marginBottom: spacing.md }}>@{user?.handle}</Text>
          <Field value={displayName} onChangeText={setDisplayName} placeholder="Display name" />
          <Text style={{ height: spacing.sm }} />
          <Field value={bio} onChangeText={setBio} placeholder="Bio" multiline />
          <Text style={{ height: spacing.sm }} />
          <Button label={updateProfile.isPending ? "Saving…" : "Save profile"} onPress={() => updateProfile.mutate()} />
        </Card>
        <Card>
          <Text style={{ color: palette.dusk, marginBottom: spacing.md }}>
            AT Protocol sign-in now uses the native OAuth client. Keep the demo path until your hosted client metadata and redirect URI are configured.
          </Text>
          <Button
            label="Sign out"
            tone="secondary"
            onPress={() => {
              void signOut();
              router.replace("/sign-in");
            }}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
