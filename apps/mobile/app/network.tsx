import { useState } from 'react';
import { View, Text, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import type { Profile } from '@tribe/domain';
import { api } from '../src/api';
import { useSession } from '../src/session';
import {
  Page,
  Header,
  Button,
  Input,
  Avatar,
  Empty,
  Loading,
  ErrorText,
  Icon,
  s,
  colors,
} from '../src/ui';
type Actor = Pick<Profile, 'did' | 'handle' | 'displayName' | 'avatarUrl'>;
type PublicPost = {
  uri: string;
  record: { text?: string };
  author: { displayName?: string; handle: string };
  indexedAt: string;
};
export default function Network() {
  const { user, loading } = useSession();
  const [search, setSearch] = useState(''),
    [q, setQ] = useState(''),
    [actor, setActor] = useState<Actor | null>(null);
  const result = useQuery({
    queryKey: ['network-search', q],
    queryFn: () => api<Actor[]>('/network/search?q=' + encodeURIComponent(q)),
    enabled: !!q,
  });
  const posts = useQuery({
    queryKey: ['network-posts', actor?.did],
    queryFn: () => api<PublicPost[]>('/network/posts?did=' + encodeURIComponent(actor!.did)),
    enabled: !!actor,
  });
  if (loading)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (!user) return <Redirect href="/sign-in" />;
  return (
    <Page back>
      <Header
        title="Beyond your circles."
        subtitle="Explore public profiles and posts on the AT network. These posts can be seen outside Tribe."
      />
      <View style={[s.card, { backgroundColor: colors.soft }]}>
        <View style={s.row}>
          <Icon name="globe-outline" color={colors.green} />
          <Text style={s.label}>Public network</Text>
        </View>
        <Text style={s.small}>
          Filtering public posts doesn’t make them private. Your Tribe moments and circle
          assignments stay separate.
        </Text>
      </View>
      <Input
        accessibilityLabel="Search public network"
        placeholder="Find a handle"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        onSubmitEditing={() => setQ(search.trim())}
      />
      <Button
        quiet
        disabled={!search.trim()}
        onPress={() => {
          setQ(search.trim());
          setActor(null);
        }}
      >
        Search public profiles
      </Button>
      <ErrorText error={result.error ?? posts.error} />
      {result.isFetching && <Loading />}
      {result.data?.length === 0 && (
        <Empty
          title="No profiles found"
          body="Check the handle and try another search."
          icon="search-outline"
        />
      )}
      {result.data?.map((p) => (
        <View style={[s.row, { paddingVertical: 12 }]} key={p.did}>
          <View style={[s.row, { flex: 1, minWidth: 0 }]}>
            <Avatar user={p} />
            <View style={s.person}>
              <Text style={s.label} numberOfLines={1}>
                {p.displayName}
              </Text>
              <Text style={s.small} numberOfLines={1}>
                @{p.handle}
              </Text>
            </View>
          </View>
          <Button quiet onPress={() => setActor(p)}>
            See posts
          </Button>
        </View>
      ))}
      {posts.isFetching && <Loading />}
      {actor && posts.data?.length === 0 && (
        <Empty title="No public posts here" body="This person’s public feed is quiet right now." />
      )}
      {posts.data?.map((p) => (
        <View key={p.uri} style={s.card}>
          <Text style={s.label}>{p.author.displayName ?? p.author.handle}</Text>
          <Text style={s.small}>Public · {new Date(p.indexedAt).toLocaleDateString()}</Text>
          <Text style={s.body}>{p.record.text ?? 'Open this post to view its content.'}</Text>
          <Button
            quiet
            onPress={() =>
              Linking.openURL(
                'https://bsky.app/profile/' +
                  encodeURIComponent(actor!.did) +
                  '/post/' +
                  encodeURIComponent(p.uri.split('/').at(-1)!),
              )
            }
          >
            Open public post
          </Button>
        </View>
      ))}
    </Page>
  );
}
