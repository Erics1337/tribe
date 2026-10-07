import { useEffect, useState } from 'react';
import { Text, View, Switch, Platform } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { zipSync, strToU8 } from 'fflate';
import type { Profile, Post } from '@tribe/domain';
import { api, response, getCredentials } from '../../src/api';
import { useSession } from '../../src/session';
import {
  Page,
  Header,
  Avatar,
  Button,
  Input,
  ErrorText,
  confirmAction,
  s,
  colors,
  Feedback,
} from '../../src/ui';
type Me = Profile & {
  notifications: boolean;
  quietStart: number;
  quietEnd: number;
  timezone: string;
};
export default function ProfileScreen() {
  const { user, reload, logout } = useSession();
  const query = useQueryClient();
  const [name, setName] = useState(''),
    [bio, setBio] = useState(''),
    [start, setStart] = useState('22'),
    [end, setEnd] = useState('8'),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [showSessions, setShowSessions] = useState(false);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me') });
  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api<{ id: string; created_at: string }[]>('/me/sessions'),
  });
  const safety = useQuery({
    queryKey: ['safety'],
    queryFn: () => api<{ blocks: { did: string }[]; mutes: { did: string }[] }>('/safety'),
  });
  useEffect(() => {
    if (me.data) {
      setName(me.data.displayName);
      setBio(me.data.bio);
      setStart(String(me.data.quietStart));
      setEnd(String(me.data.quietEnd));
    }
  }, [me.data]);
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
  async function push(enabled: boolean) {
    if (!enabled) {
      await api('/me', 'PATCH', { notifications: false, pushToken: null });
      return;
    }
    if (Platform.OS === 'web' || !Device.isDevice)
      throw new Error(
        'Push notifications need a physical phone and a configured release or development build.',
      );
    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted')
      throw new Error('Allow notifications in your phone settings to enable replies.');
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) throw new Error('Push delivery requires an EAS project ID in the app build.');
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api('/me', 'PATCH', {
      notifications: true,
      pushToken: token,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }
  async function download() {
    const data = await api<{ posts: Post[] }>('/me/export');
    const files: Record<string, Uint8Array> = {
      'tribe.json': strToU8(JSON.stringify(data, null, 2)),
    };
    for (const p of data.posts)
      for (const m of p.media)
        files['media/' + m.id + '.jpg'] = new Uint8Array(
          await (await response('/me/export/media/' + m.id)).arrayBuffer(),
        );
    const bytes = zipSync(files);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tribe-export.zip';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const file = new File(Paths.cache, 'tribe-export.zip');
      file.create({ overwrite: true });
      file.write(bytes);
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, { mimeType: 'application/zip' });
      else throw new Error('Sharing is unavailable on this device.');
    }
    setNotice(
      'Your archive includes your moments, photos, circle assignments and authored replies.',
    );
  }
  return (
    <Page
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
      <Header title="You, on Tribe." />
      {user && (
        <View
          style={[
            s.row,
            { paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.line },
          ]}
        >
          <Avatar user={user} size={64} />
          <View style={s.person}>
            <Text style={s.heading}>{user.displayName}</Text>
            <Text style={s.small}>@{user.handle}</Text>
          </View>
        </View>
      )}
      <ErrorText error={me.error ?? sessions.error ?? safety.error} />
      <View style={s.section}>
        <Text accessibilityRole="header" style={s.heading}>
          Your Tribe profile
        </Text>
        <View style={s.field}>
          <Text style={s.label}>Name</Text>
          <Input
            accessibilityLabel="Display name"
            value={name}
            onChangeText={setName}
            maxLength={80}
          />
        </View>
        <View style={s.field}>
          <Text style={s.label}>A little about you</Text>
          <Input
            accessibilityLabel="Profile bio"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={500}
          />
        </View>
        <Button
          disabled={busy || !name.trim()}
          onPress={() =>
            act(async () => {
              await api('/me', 'PATCH', { displayName: name, bio });
              await reload();
              setNotice('Profile saved.');
            })
          }
        >
          Save profile
        </Button>
        <Text style={s.small}>
          This updates your Tribe profile. Your public AT profile is managed by your account
          provider.
        </Text>
      </View>
      <View style={s.section}>
        <View style={s.between}>
          <View style={{ flex: 1 }}>
            <Text style={s.heading}>A gentle heads-up</Text>
            <Text style={s.small}>Replies and appreciations. Always opt-in.</Text>
          </View>
          <Switch
            accessibilityLabel="Enable push notifications"
            value={me.data?.notifications ?? false}
            disabled={busy}
            trackColor={{ true: colors.green, false: colors.line }}
            onValueChange={(v) =>
              act(() => push(v), v ? 'Notifications enabled.' : 'Notifications turned off.')
            }
          />
        </View>
        <View style={s.divider} />
        <Text style={s.label}>Quiet hours · your local timezone</Text>
        <Text style={s.small}>
          Use the 24-hour clock: 22 means 10 pm. Matching hours turn quiet hours off.
        </Text>
        <View style={s.row}>
          <Input
            accessibilityLabel="Quiet hours start"
            value={start}
            onChangeText={setStart}
            keyboardType="number-pad"
            maxLength={2}
            style={{ flex: 1 }}
          />
          <Text style={s.body}>to</Text>
          <Input
            accessibilityLabel="Quiet hours end"
            value={end}
            onChangeText={setEnd}
            keyboardType="number-pad"
            maxLength={2}
            style={{ flex: 1 }}
          />
        </View>
        <Button
          quiet
          disabled={busy}
          onPress={() =>
            act(
              () =>
                api('/me', 'PATCH', {
                  quietStart: Number(start),
                  quietEnd: Number(end),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                }),
              'Quiet hours saved.',
            )
          }
        >
          Save quiet hours
        </Button>
      </View>
      <View style={[s.section, { paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.line }]}>
        <Text accessibilityRole="header" style={s.heading}>
          Your data belongs with you
        </Text>
        <Text style={s.body}>
          Your AT identity is portable. Private Tribe moments live here, and you can export your own
          data and photos.
        </Text>
        <Button quiet disabled={busy} icon="download-outline" onPress={() => act(download)}>
          Download your archive
        </Button>
        <Text style={s.small}>
          Private sharing uses access controls, not end-to-end encryption. People can keep
          screenshots or downloaded copies.
        </Text>
      </View>
      <View style={[s.section, { paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.line }]}>
        <Text accessibilityRole="header" style={s.heading}>
          Signed-in devices
        </Text>
        {sessions.data?.slice(0, showSessions ? undefined : 3).map((session) => (
          <View key={session.id} style={s.between}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>
                {session.id === getCredentials()?.sessionId ? 'This device' : 'Another session'}
              </Text>
              <Text style={s.small}>{new Date(session.created_at).toLocaleDateString()}</Text>
            </View>
            {session.id !== getCredentials()?.sessionId && (
              <Button
                quiet
                disabled={busy}
                onPress={() =>
                  act(() => api('/me/sessions/' + session.id, 'DELETE'), 'Device signed out.')
                }
              >
                Revoke
              </Button>
            )}
          </View>
        ))}
        {!!sessions.data && sessions.data.length > 3 && (
          <Button quiet onPress={() => setShowSessions(!showSessions)}>
            {showSessions ? 'Show fewer devices' : `Show all devices (${sessions.data.length})`}
          </Button>
        )}
      </View>
      {['blocks', 'mutes'].map((kind) => {
        const list = safety.data?.[kind as 'blocks' | 'mutes'] ?? [];
        return (
          list.length > 0 && (
            <View key={kind} style={s.card}>
              <Text style={s.heading}>
                {kind === 'blocks' ? 'Blocked accounts' : 'Muted accounts'}
              </Text>
              {list.map((p) => (
                <View key={p.did} style={{ gap: 10 }}>
                  <Text style={s.small}>{p.did}</Text>
                  <Button
                    quiet
                    disabled={busy}
                    onPress={() =>
                      act(
                        () => api('/' + kind + '/' + encodeURIComponent(p.did), 'DELETE'),
                        kind === 'blocks' ? 'Account unblocked.' : 'Account unmuted.',
                      )
                    }
                  >
                    {kind === 'blocks' ? 'Unblock' : 'Unmute'}
                  </Button>
                </View>
              ))}
            </View>
          )
        );
      })}
      <View style={s.divider} />
      <Button quiet onPress={() => router.push('/admin')}>
        Moderation tools
      </Button>
      <Button quiet disabled={busy} onPress={() => act(logout)}>
        Sign out
      </Button>
      <Button
        quiet
        danger
        disabled={busy}
        onPress={async () => {
          if (
            await confirmAction(
              'Delete your Tribe account?',
              'Your private moments will become unavailable immediately, and your photos will be removed by the cleanup worker. Your AT account stays with its provider.',
            )
          )
            await act(async () => {
              await api('/me', 'DELETE');
              await logout();
              router.replace('/sign-in');
            });
        }}
      >
        Delete Tribe account
      </Button>
      <Text style={[s.small, { textAlign: 'center' }]}>Tribe · A little closer</Text>
    </Page>
  );
}
