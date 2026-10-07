import { useState } from 'react';
import { Text, View, Pressable, Share } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tiers,
  labels,
  caps,
  nestedCounts,
  type Tier,
  type Connection,
  type Profile,
} from '@tribe/domain';
import { api } from '../../src/api';
import {
  Page,
  Header,
  Button,
  Input,
  Avatar,
  Icon,
  ErrorText,
  Loading,
  Empty,
  TierPicker,
  confirmAction,
  s,
  colors,
} from '../../src/ui';
export default function Circles() {
  const query = useQueryClient();
  const [search, setSearch] = useState(''),
    [submitted, setSubmitted] = useState(''),
    [tier, setTier] = useState<Tier>('inner'),
    [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState<unknown>(null);
  const people = useQuery({
    queryKey: ['connections'],
    queryFn: () => api<Connection[]>('/connections'),
  });
  const result = useQuery({
    queryKey: ['search', submitted],
    queryFn: () =>
      api<Pick<Profile, 'did' | 'handle' | 'displayName' | 'avatarUrl'>[]>(
        '/network/search?q=' + encodeURIComponent(submitted),
      ),
    enabled: submitted.length > 0,
  });
  const save = useMutation({
    mutationFn: ({ did, tier }: { did: string; tier: Tier }) =>
      api('/connections', 'PUT', { did, tier }),
    onSuccess: () => {
      query.invalidateQueries({ queryKey: ['connections'] });
      query.invalidateQueries({ queryKey: ['audience'] });
      query.invalidateQueries({ queryKey: ['feed'] });
      setSelected(null);
    },
  });
  const counts = nestedCounts(people.data ?? []);
  return (
    <Page>
      <Header
        eyebrow="Relationships, with intention"
        title="Make space for your people."
        subtitle="Your circles are private. Wider circles include the people in your smaller ones."
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tiers.map((t) => (
          <View key={t} style={[s.card, { width: '48%', padding: 18, gap: 10 }]}>
            <View style={s.between}>
              <Text style={s.label}>{labels[t]}</Text>
              <Icon name="ellipse-outline" size={20} color={colors.green} />
            </View>
            <Text style={[s.title, { fontSize: 28 }]}>
              {counts[t]}
              <Text style={[s.body, { fontSize: 16 }]}> / {caps[t]}</Text>
            </Text>
            <View style={{ height: 4, backgroundColor: colors.soft, borderRadius: 4 }}>
              <View
                style={{
                  height: 4,
                  width: `${(counts[t] / caps[t]) * 100}%`,
                  backgroundColor: colors.green,
                  borderRadius: 4,
                }}
              />
            </View>
          </View>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Find a familiar face</Text>
        <Input
          accessibilityLabel="Find people by handle"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setSubmitted(search.trim())}
          autoCapitalize="none"
          placeholder="Search an AT handle"
        />
        <Button
          quiet
          onPress={() => setSubmitted(search.trim())}
          disabled={!search.trim()}
          icon="search-outline"
        >
          Search people
        </Button>
        <TierPicker value={tier} onChange={(t) => setTier(t as Tier)} />
        <Text style={s.small}>
          New connections only receive moments shared after they join. Nobody can see their
          assignment.
        </Text>
        <ErrorText error={result.error ?? save.error} />
        {result.isFetching && <Loading />}
        {result.data?.map((p) => (
          <View style={s.between} key={p.did}>
            <View style={[s.row, { flex: 1 }]}>
              <Avatar user={p} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{p.displayName}</Text>
                <Text style={s.small} numberOfLines={1}>
                  @{p.handle}
                </Text>
              </View>
            </View>
            <Button
              quiet
              disabled={save.isPending}
              onPress={() => save.mutate({ did: p.did, tier })}
            >
              {people.data?.some((c) => c.did === p.did) ? 'Move' : 'Add'}
            </Button>
          </View>
        ))}
      </View>
      <View style={s.between}>
        <Text style={s.heading}>Your connections</Text>
        <Button
          quiet
          icon="link-outline"
          onPress={async () => {
            try {
              const { url } = await api<{ url: string }>('/invitations', 'POST');
              await Share.share({ message: 'Come a little closer. Join me on Tribe: ' + url });
            } catch (e) {
              setError(e);
            }
          }}
        >
          Invite
        </Button>
      </View>
      <ErrorText error={people.error ?? error} />
      {people.isPending && <Loading />}
      {people.data?.length === 0 && (
        <Empty
          title="Start with one person"
          body="Someone you’d like to hear from. You can build your circles over time."
          icon="people-outline"
        />
      )}
      {tiers.map((t) => {
        const members = people.data?.filter((c) => c.tier === t) ?? [];
        return (
          members.length > 0 && (
            <View key={t} style={{ gap: 12 }}>
              <Text style={[s.small, { letterSpacing: 1.5, textTransform: 'uppercase' }]}>
                {labels[t]}
              </Text>
              {members.map((c) => (
                <View key={c.did} style={s.card}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={'Manage ' + c.displayName}
                    onPress={() => setSelected(selected === c.did ? null : c.did)}
                    style={s.between}
                  >
                    <View style={s.row}>
                      <Avatar user={c} />
                      <View>
                        <Text style={s.label}>{c.displayName}</Text>
                        <Text style={s.small}>
                          {c.joined ? 'On Tribe' : 'Hasn’t joined Tribe yet'}
                        </Text>
                      </View>
                    </View>
                    <Icon name="chevron-down-outline" size={18} />
                  </Pressable>
                  {selected === c.did && (
                    <>
                      <TierPicker
                        value={c.tier}
                        onChange={(v) => save.mutate({ did: c.did, tier: v as Tier })}
                      />
                      <Button
                        quiet
                        onPress={async () => {
                          if (
                            await confirmAction(
                              'Remove this connection?',
                              'They’ll lose access to your older private moments. Re-adding them won’t restore that access.',
                            )
                          ) {
                            try {
                              await api('/connections/' + encodeURIComponent(c.did), 'DELETE');
                              await query.invalidateQueries();
                              setSelected(null);
                            } catch (e) {
                              setError(e);
                            }
                          }
                        }}
                      >
                        Remove connection
                      </Button>
                    </>
                  )}
                </View>
              ))}
            </View>
          )
        );
      })}
    </Page>
  );
}
