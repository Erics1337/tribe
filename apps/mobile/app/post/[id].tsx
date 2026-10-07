import { useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, router, Redirect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Post, Comment } from '@tribe/domain';
import { api } from '../../src/api';
import { useSession } from '../../src/session';
import { Photo } from '../../src/moment';
import {
  Page,
  Avatar,
  Button,
  Input,
  ErrorText,
  Loading,
  confirmAction,
  s,
  IconButton,
  colors,
  Feedback,
} from '../../src/ui';
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { user, loading } = useSession();
  const query = useQueryClient();
  const [body, setBody] = useState(''),
    [reason, setReason] = useState(''),
    [reporting, setReporting] = useState(false),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const post = useQuery({
    queryKey: ['post', id],
    queryFn: () => api<Post>('/posts/' + id),
    retry: false,
    enabled: !!user,
  });
  const comments = useQuery({
    queryKey: ['comments', id],
    queryFn: () => api<Comment[]>('/posts/' + id + '/comments'),
    enabled: !!post.data,
  });
  async function act(fn: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setError(null);
    setNotice('');
    try {
      await fn();
      await query.invalidateQueries();
      if (success) setNotice(success);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (!user) return <Redirect href="/sign-in" />;
  return (
    <Page
      back
      feedback={
        <Feedback
          error={error}
          message={notice}
          onDismiss={() => {
            setError(null);
            setNotice('');
          }}
        />
      }
    >
      <ErrorText error={post.error} />
      {post.isPending && <Loading />}
      {post.data && (
        <>
          <View style={s.row}>
            <Avatar user={post.data.author} />
            <View style={s.person}>
              <Text style={s.heading}>{post.data.author.displayName}</Text>
              <Text style={s.small}>
                Shared privately · {new Date(post.data.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {post.data.media.map((m) => (
            <View key={m.id} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <Photo asset={m} />
            </View>
          ))}
          <Text style={[s.body, { color: colors.ink }]}>{post.data.body}</Text>
          <Button
            quiet
            disabled={busy}
            onPress={() => act(() => api('/posts/' + id + '/reaction', 'POST'))}
            icon={post.data.reacted ? 'heart' : 'heart-outline'}
          >
            {post.data.reacted ? 'Appreciated' : 'Send a little love'} · {post.data.reactionCount}
          </Button>
          <View style={s.divider} />
          <Text accessibilityRole="header" style={s.heading}>
            A conversation
          </Text>
          <ErrorText error={comments.error} />
          {comments.isPending && <Loading />}
          {comments.data?.length === 0 && (
            <Text style={s.body}>No replies yet. You can start the conversation.</Text>
          )}
          {comments.data?.map((c) => (
            <View key={c.id} style={{ gap: 10, paddingVertical: 12 }}>
              <View style={s.row}>
                <Avatar user={c.author} size={32} />
                <Text style={[s.label, { flex: 1 }]}>{c.author.displayName}</Text>
                {c.author.id === user.id && (
                  <IconButton
                    name="trash-outline"
                    label="Delete reply"
                    disabled={busy}
                    onPress={() => act(() => api('/comments/' + c.id, 'DELETE'))}
                  />
                )}
              </View>
              <Text style={s.body}>{c.body}</Text>
            </View>
          ))}
          <Input
            accessibilityLabel="Your reply"
            value={body}
            onChangeText={setBody}
            placeholder="Say something kind…"
            multiline
            maxLength={1000}
          />
          <Button
            disabled={busy || !body.trim()}
            onPress={() =>
              act(async () => {
                await api('/posts/' + id + '/comments', 'POST', { body });
                setBody('');
              })
            }
          >
            Send reply
          </Button>
          <View style={s.divider} />
          {post.data.author.id === user.id ? (
            <Button
              quiet
              danger
              disabled={busy}
              onPress={async () => {
                if (
                  await confirmAction(
                    'Delete this moment?',
                    'It will no longer be available to anyone you shared it with.',
                  )
                )
                  await act(async () => {
                    await api('/posts/' + id, 'DELETE');
                    router.back();
                  });
              }}
            >
              Delete moment
            </Button>
          ) : (
            <>
              <Button quiet onPress={() => setReporting(!reporting)}>
                Report this moment
              </Button>
              {reporting && (
                <>
                  <Input
                    accessibilityLabel="Report reason"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Tell us what happened"
                    multiline
                    maxLength={1000}
                  />
                  <Button
                    disabled={busy || reason.trim().length < 3}
                    onPress={() =>
                      act(async () => {
                        await api('/reports', 'POST', { postId: id, reason });
                        setReporting(false);
                        setReason('');
                      }, 'Report sent.')
                    }
                  >
                    Send report
                  </Button>
                </>
              )}
              <Button
                quiet
                disabled={busy}
                onPress={() =>
                  act(
                    () => api('/mutes', 'POST', { did: post.data!.author.did }),
                    'This person is muted.',
                  )
                }
              >
                Mute this person
              </Button>
              <Button
                quiet
                danger
                disabled={busy}
                onPress={async () => {
                  if (
                    await confirmAction(
                      'Block this person?',
                      'You’ll both lose access to each other’s private moments. Unblocking won’t restore old access.',
                    )
                  )
                    await act(async () => {
                      await api('/blocks', 'POST', { did: post.data!.author.did });
                      router.replace('/');
                    });
                }}
              >
                Block this person
              </Button>
            </>
          )}
        </>
      )}
    </Page>
  );
}
