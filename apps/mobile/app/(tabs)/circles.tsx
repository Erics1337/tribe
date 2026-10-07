import { useState } from 'react';
import { Text, View, Share } from 'react-native';
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
  Action,
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
        title="Make space for your people."
        subtitle="Your circles are private. Wider circles include the people in your smaller ones."
      />
      <View style={s.card}>
        {tiers.map((t, i) => (
          <View key={t} style={[s.between, { paddingVertical: 8 }]}>
            <View style={[s.row, { flex: 1 }]}>
              <View
                style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 12 + i * 5,
                    height: 12 + i * 5,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: colors.green,
                  }}
                />
              </View>
              <Text style={s.label}>{labels[t]}</Text>
            </View>
            <Text
              accessibilityLabel={`${labels[t]}: ${counts[t]} of ${caps[t]} connections`}
              style={[s.label, { fontVariant: ['tabular-nums'], fontSize: 16 }]}
            >
              {counts[t]} <Text style={s.small}>of {caps[t]}</Text>
            </Text>
          </View>
        ))}
      </View>
      <View style={s.section}>
        <Text accessibilityRole="header" style={s.heading}>
          Find a familiar face
        </Text>
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
        {result.data?.length === 0 && (
          <Empty
            title="No familiar faces found"
            body="Check the spelling of the handle and try again."
            icon="search-outline"
          />
        )}
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
              <Text accessibilityRole="header" style={s.heading}>
                {labels[t]}
              </Text>
              {members.map((c) => (
                <View
                  key={c.did}
                  style={{
                    gap: 12,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                  }}
                >
                  <Action
                    label={'Manage ' + c.displayName}
                    onPress={() => setSelected(selected === c.did ? null : c.did)}
                    style={s.between}
                  >
                    <View style={[s.row, { flex: 1, minWidth: 0 }]}>
                      <Avatar user={c} />
                      <View style={s.person}>
                        <Text style={s.label} numberOfLines={1}>
                          {c.displayName}
                        </Text>
                        <Text style={s.small}>
                          {c.joined ? 'On Tribe' : 'Hasn’t joined Tribe yet'}
                        </Text>
                      </View>
                    </View>
                    <Icon
                      name={selected === c.did ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={18}
                    />
                  </Action>
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
