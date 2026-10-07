import { useState } from 'react';
import { View, Text, Platform, useWindowDimensions } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useSession, navigateAfterLogin } from '../src/session';
import { Page, Header, Button, Input, ErrorText, Icon, Loading, s, colors } from '../src/ui';
import { setCredentials } from '../src/api';
export default function SignIn() {
  const { user, login, reload, loading } = useSession();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [handle, setHandle] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [local, setLocal] = useState('');
  if (loading)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (user) return <Redirect href="/" />;
  return (
    <Page maxWidth={960}>
      <View style={[s.between, { marginBottom: wide ? 56 : 12 }]}>
        <Text style={[s.heading, { fontSize: 28, letterSpacing: -0.8 }]}>tribe.</Text>
        <Text style={s.small}>A little closer</Text>
      </View>
      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          gap: wide ? 64 : 28,
          alignItems: wide ? 'flex-start' : 'stretch',
        }}
      >
        <View style={{ flex: wide ? 1 : undefined, gap: 24 }}>
          <Header
            title={'Make room for\nwhat matters.'}
            subtitle="A quieter place to share the everyday. Your photos, your people, your pace."
          />
          {wide && (
            <View style={{ gap: 16, marginTop: 16 }}>
              <Icon name="people-outline" size={32} color={colors.green} />
              <Text style={[s.body, { maxWidth: 300 }]}>
                Small circles within wider ones. You choose who belongs.
              </Text>
            </View>
          )}
        </View>
        <View style={{ flex: wide ? 1 : undefined, gap: 20 }}>
          <View style={s.field}>
            <Text style={s.label}>Your AT Protocol handle</Text>
            <Input
              accessibilityLabel="AT Protocol handle"
              placeholder="you.bsky.social"
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              editable={!busy}
            />
          </View>
          <Button
            disabled={!handle.trim()}
            busy={busy}
            onPress={async () => {
              setBusy(true);
              setError(null);
              try {
                await login(handle);
                if (Platform.OS !== 'web') await navigateAfterLogin();
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            }}
            icon="arrow-forward-outline"
          >
            {busy ? 'Connecting…' : 'Continue with your account'}
          </Button>
          <ErrorText error={error} />
          <View style={[s.row, { alignItems: 'flex-start', gap: 10 }]}>
            <Icon name="lock-closed-outline" size={16} color={colors.green} />
            <Text style={[s.small, { flex: 1 }]}>
              Your account travels with you. Your private moments stay with the people you choose.
            </Text>
          </View>
          <View style={s.divider} />
          <Text style={s.body}>
            Already have a Bluesky account? Use the same handle. You’ll sign in securely with your
            account provider.
          </Text>
          {__DEV__ && (
            <View style={{ gap: 10 }}>
              <Text style={s.small}>Local development session</Text>
              <Input
                accessibilityLabel="Local session JSON"
                placeholder="Paste credentials from pnpm dev:seed"
                value={local}
                onChangeText={setLocal}
              />
              <Button
                quiet
                disabled={!local}
                onPress={async () => {
                  try {
                    await setCredentials(JSON.parse(local));
                    await reload();
                    router.replace('/');
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                Open local preview
              </Button>
            </View>
          )}
        </View>
      </View>
      <View
        style={{
          gap: 16,
          marginTop: wide ? 40 : 8,
          paddingTop: 24,
          borderTopWidth: 1,
          borderTopColor: colors.line,
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {[5, 15, 50, 150].map((n, i) => (
            <View key={n} style={{ flex: 1, minWidth: 64, gap: 8 }}>
              <View style={{ height: 32, justifyContent: 'center' }}>
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
              <Text style={s.label}>{['Inner', 'Close', 'Tribe', 'Village'][i]}</Text>
              <Text style={s.small}>Room for {n}</Text>
            </View>
          ))}
        </View>
        {!wide && (
          <Text style={s.small}>Small circles within wider ones. You choose who belongs.</Text>
        )}
      </View>
    </Page>
  );
}
