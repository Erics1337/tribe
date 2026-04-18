import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { FeedItem, TierId } from "@tribe/shared";
import { api } from "../../lib/api";
import { useSession } from "../../hooks/use-session";
import { Button, Card, Field, Pill } from "../../components/primitives";
import { palette, spacing } from "../../theme/tokens";

const REACTIONS = ["🫶", "👏", "🌿"];

export function FeedCard({ item, tier }: { item: FeedItem; tier: TierId }) {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const reactionMutation = useMutation({
    mutationFn: (emoji: string) => api.createReaction(token!, { postId: item.post.id, emoji }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed", tier] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => api.createComment(token!, { postId: item.post.id, body: comment }),
    onSuccess: async () => {
      setComment("");
      await queryClient.invalidateQueries({ queryKey: ["feed", tier] });
    },
  });

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: palette.ink }}>{item.author.displayName}</Text>
          <Text style={{ color: palette.dusk }}>@{item.author.handle}</Text>
        </View>
        <Pill label={item.post.audience} />
      </View>
      <Text style={{ color: palette.ink, fontSize: 16, lineHeight: 24 }}>{item.post.body}</Text>
      {item.post.photoUrl ? (
        <Image
          source={{ uri: item.post.photoUrl }}
          style={{ width: "100%", height: 180, borderRadius: 18, marginTop: spacing.md, backgroundColor: palette.faint }}
          resizeMode="cover"
        />
      ) : null}
      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
        {REACTIONS.map((emoji) => (
          <Pressable key={emoji} onPress={() => reactionMutation.mutate(emoji)}>
            <Text style={{ fontSize: 22 }}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }}>
        {item.reactions.map((reaction) => (
          <Pill key={reaction.id} label={reaction.emoji} />
        ))}
      </View>
      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        {item.comments.map((entry) => (
          <View key={entry.id} style={{ backgroundColor: palette.paper, borderRadius: 16, padding: spacing.sm }}>
            <Text style={{ fontWeight: "700", color: palette.ink }}>{entry.authorId}</Text>
            <Text style={{ color: palette.ink }}>{entry.body}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Field value={comment} onChangeText={setComment} placeholder="Leave a comment" />
        <Button label="Reply" onPress={() => commentMutation.mutate()} disabled={!comment.trim()} tone="secondary" />
      </View>
    </Card>
  );
}
