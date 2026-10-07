import { Photo } from '../src/moment';
import type { Asset } from '@tribe/domain';
import { useSession } from '../src/session';
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APIError } from '../src/api';
import { api } from '../src/api';
import { Page, Header, Button, ErrorText, Loading, Empty, confirmAction, s } from '../src/ui';
type Report = {
  id: string;
  post_id: string;
  reason: string;
  status: string;
  created_at: string;
  evidence: { body: string; author: { displayName: string }; media: Asset[] };
};
export default function Admin() {
  const { user, loading } = useSession();
  const query = useQueryClient();
  const q = useQuery({
    queryKey: ['reports'],
    queryFn: () => api<Report[]>('/admin/reports'),
    retry: false,
    enabled: !!user,
  });
  const action = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api('/admin/reports/' + id, 'POST', { action }),
    onSuccess: () => query.invalidateQueries(),
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
        title="Reported moments."
        subtitle="Evidence is retained for review. Staff actions are logged."
      />
      {q.error instanceof APIError && q.error.status === 403 ? (
        <Empty
          title="Staff access required"
          body="This space is available to authorized Tribe moderators."
          icon="lock-closed-outline"
        />
      ) : (
        <ErrorText error={q.error ?? action.error} />
      )}
      {q.isPending && <Loading />}
      {q.data?.length === 0 && (
        <Empty title="No reports to review" body="New reports will appear here." />
      )}
      {q.data?.map((r) => (
        <View key={r.id} style={s.card}>
          <Text style={s.small}>
            {r.status} · {new Date(r.created_at).toLocaleDateString()}
          </Text>
          <Text style={s.heading}>{r.reason}</Text>
          <Text style={s.label}>{r.evidence.author.displayName}</Text>
          <Text style={s.body}>{r.evidence.body}</Text>
          {r.evidence.media?.map((asset) => (
            <Photo
              key={asset.id}
              asset={asset}
              path={'/admin/reports/' + r.id + '/media/' + asset.id}
            />
          ))}
          {r.status === 'open' && (
            <>
              <Button
                quiet
                disabled={action.isPending}
                onPress={() => action.mutate({ id: r.id, action: 'dismiss' })}
              >
                Dismiss report
              </Button>
              <Button
                danger
                disabled={action.isPending}
                onPress={async () => {
                  if (
                    await confirmAction(
                      'Take down this moment?',
                      'This removes user access immediately and records the action in the staff audit trail.',
                    )
                  )
                    action.mutate({ id: r.id, action: 'takedown' });
                }}
              >
                Take down moment
              </Button>
            </>
          )}
        </View>
      ))}
    </Page>
  );
}
