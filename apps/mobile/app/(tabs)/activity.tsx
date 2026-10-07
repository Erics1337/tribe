import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Profile } from '@tribe/domain';
import { api } from '../../src/api';
import {
  Page,
  Header,
  Avatar,
  Empty,
  Loading,
  ErrorText,
  Button,
  Icon,
  s,
  colors,
  Action,
} from '../../src/ui';
type Activity = {
  id: string;
  actor: Profile;
  kind: string;
  postId: string;
  createdAt: string;
  read: boolean;
};
export default function Activity() {
  const query = useQueryClient();
  const q = useQuery({ queryKey: ['activity'], queryFn: () => api<Activity[]>('/activity') });
  const read = useMutation({
    mutationFn: () => api('/activity/read', 'POST'),
    onSuccess: () => query.invalidateQueries({ queryKey: ['activity'] }),
  });
  return (
    <Page>
      <Header title="A little love." subtitle="Replies and appreciations from your people." />
      <ErrorText error={q.error ?? read.error} />
      {q.isPending && <Loading />}
      {q.data?.length === 0 && (
        <Empty
          title="Nothing new just yet"
          body="When someone responds to your moment, you'll find it here."
          icon="heart-outline"
        />
      )}
      {q.data?.map((a) => (
        <Action
          key={a.id}
          onPress={() => router.push({ pathname: '/post/[id]', params: { id: a.postId } })}
          style={[
            s.listRow,
            { paddingHorizontal: 12, backgroundColor: a.read ? undefined : colors.soft },
          ]}
          label={`${a.actor.displayName} ${a.kind === 'comment' ? 'left you a reply' : 'appreciated your moment'}${a.read ? '' : ', unread'}`}
        >
          <View style={[s.row, { flex: 1 }]}>
            <Avatar user={a.actor} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{a.actor.displayName}</Text>
              <Text style={s.body}>
                {a.kind === 'comment' ? 'Left you a reply' : 'Appreciated your moment'}
              </Text>
              <Text style={s.small}>{new Date(a.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
          {!a.read && (
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green }} />
          )}
          <Icon name="chevron-forward-outline" size={16} />
        </Action>
      ))}
      {!!q.data?.length && (
        <Button quiet disabled={read.isPending} onPress={() => read.mutate()}>
          Mark all as read
        </Button>
      )}
    </Page>
  );
}
