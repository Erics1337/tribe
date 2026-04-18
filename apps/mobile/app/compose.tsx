import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { TIER_ORDER, type TierId } from "@tribe/shared";
import { Button, Card, Field, Heading, Pill, Screen } from "../src/components/primitives";
import { useSession } from "../src/hooks/use-session";
import { api } from "../src/lib/api";
import { palette, spacing } from "../src/theme/tokens";

export default function ComposeScreen() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [audience, setAudience] = useState<TierId>("inner");
  const [body, setBody] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>();

  const postMutation = useMutation({
    mutationFn: () => api.createPost(token!, { audience, body, photoUrl }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      router.back();
    },
  });

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoUrl(result.assets[0]?.uri);
    }
  }

  return (
    <Screen>
      <Heading title="Compose" subtitle="Pick the exact circle before you post." />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={{ color: palette.dusk, marginBottom: spacing.sm }}>Audience</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {TIER_ORDER.map((tier) => (
              <Pill key={tier} label={tier} active={tier === audience} onPress={() => setAudience(tier)} />
            ))}
          </View>
        </Card>
        <Card>
          <Text style={{ color: palette.dusk, marginBottom: spacing.sm }}>Who sees this</Text>
          <Text style={{ color: palette.ink }}>Everyone currently in your {audience} circle at publish time.</Text>
        </Card>
        <Card>
          <Field value={body} onChangeText={setBody} placeholder="What belongs in this circle?" multiline />
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <Button label="Add a photo" onPress={pickImage} tone="secondary" />
            {photoUrl ? <Image source={{ uri: photoUrl }} style={{ width: "100%", height: 220, borderRadius: 18 }} resizeMode="cover" /> : null}
          </View>
        </Card>
        <Button label={postMutation.isPending ? "Posting…" : "Publish"} onPress={() => postMutation.mutate()} disabled={!body.trim()} />
      </ScrollView>
    </Screen>
  );
}
