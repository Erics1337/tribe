import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { Feed, Tier } from '@tribe/domain';
import { api } from '../../src/api';
import { useSession } from '../../src/session';
import {
  Page,
  Header,
  TierPicker,
  Loading,
  ErrorText,
  Empty,
  Button,
  Icon,
  Avatar,
  s,
  colors,
} from '../../src/ui';
import { Moment } from '../../src/moment';
export default function Home() {
  const { user } = useSession();
  const [tier, setTier] = useState<Tier | 'all'>('all');
  const query = useQueryClient();
  const feed = useInfiniteQuery({
    queryKey: ['feed', tier],
    initialPageParam: undefined as { cursor: string; watermark: string } | undefined,
    queryFn: ({ pageParam }) =>
      api<Feed>(
        '/feed?' +
          new URLSearchParams({ ...(tier !== 'all' ? { tier } : {}), ...(pageParam ?? {}) }),
      ),
    getNextPageParam: (last) =>
      last.cursor ? { cursor: last.cursor, watermark: last.watermark } : undefined,
  });
  const reaction = useMutation({
    mutationFn: (id: string) => api('/posts/' + id + '/reaction', 'POST'),
    onSuccess: () => query.invalidateQueries({ queryKey: ['feed'] }),
  });
  const posts = feed.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Page>
      <View style={s.between}>
        <View style={s.row}>
          <Text style={[s.heading, { fontSize: 26, letterSpacing: -1.2 }]}>tribe.</Text>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green }} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          onPress={() => router.push('/profile')}
        >
          {user && <Avatar user={user} size={38} />}
        </Pressable>
      </View>
      <Header
        eyebrow="A little closer"
        title="Your people. Your pace."
        subtitle="The everyday moments worth making room for."
      />
      <View style={[s.card, { backgroundColor: colors.soft, padding: 16 }]}>
        <View style={s.between}>
          <View style={s.row}>
            <Icon name="lock-closed-outline" size={18} color={colors.green} />
            <Text style={s.label}>A space for familiar faces</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh moments"
            onPress={() => feed.refetch()}
            style={{ padding: 6 }}
          >
            <Icon name="refresh-outline" size={19} />
          </Pressable>
        </View>
        <Text style={s.small}>Private moments, shared intentionally.</Text>
      </View>
      <TierPicker value={tier} onChange={setTier} all />
      <ErrorText error={feed.error ?? reaction.error} />
      {feed.isPending && <Loading />}
      {!feed.isPending && !posts.length && !feed.error && (
        <>
          <Empty
            title="A little quiet, for now"
            body="Find a few people you care about, or share the first moment. There’s no rush to fill this space."
          />
          <Button quiet onPress={() => router.push('/circles')} icon="people-outline">
            Find your people
          </Button>
        </>
      )}
      {posts.map((p) => (
        <Moment key={p.id} post={p} onReact={() => reaction.mutate(p.id)} />
      ))}
      {feed.hasNextPage ? (
        <Button quiet disabled={feed.isFetchingNextPage} onPress={() => feed.fetchNextPage()}>
          Load earlier moments
        </Button>
      ) : (
        posts.length > 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 12, gap: 10 }}>
            <Icon name="checkmark-circle-outline" color={colors.green} size={28} />
            <Text style={s.heading}>You’re all caught up.</Text>
            <Text style={[s.body, { textAlign: 'center' }]}>
              A good moment to get back to your day.
            </Text>
          </View>
        )
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/network')}
        style={[s.between, { paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.line }]}
      >
        <View style={{ gap: 4 }}>
          <Text style={s.label}>Beyond your circles</Text>
          <Text style={s.small}>Explore the public AT network</Text>
        </View>
        <Icon name="arrow-forward-outline" size={20} />
      </Pressable>
    </Page>
  );
}
