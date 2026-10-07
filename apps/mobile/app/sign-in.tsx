import { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useSession, navigateAfterLogin } from '../src/session';
import { Page, Header, Button, Input, ErrorText, Icon, s, colors } from '../src/ui';
import { setCredentials } from '../src/api';
export default function SignIn() {
  const { user, login, reload } = useSession();
  const [handle, setHandle] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [local, setLocal] = useState('');
  if (user) return <Redirect href="/" />;
  return (
    <Page>
      <View style={[s.between, { marginBottom: 36 }]}>
        <Text style={[s.heading, { letterSpacing: -1 }]}>tribe.</Text>
        <View style={s.row}>
          <Icon name="leaf-outline" color={colors.green} />
          <Text style={s.small}>A little closer</Text>
        </View>
      </View>
      <Header
        eyebrow="Your people, in focus"
        title={'Make room for\nwhat matters.'}
        subtitle="A quieter place to share the everyday. Your photos, your people, your pace."
      />
      <View style={[s.card, { backgroundColor: colors.soft, padding: 28, marginVertical: 8 }]}>
        {[5, 15, 50, 150].map((n, i) => (
          <View key={n} style={[s.between, { paddingVertical: 6 }]}>
            <View style={s.row}>
              <View
                style={{
                  width: 12 + i * 6,
                  height: 12 + i * 6,
                  borderRadius: 30,
                  borderWidth: 1.5,
                  borderColor: colors.green,
                }}
              />
              <Text style={s.label}>{['Inner', 'Close', 'Tribe', 'Village'][i]}</Text>
            </View>
            <Text style={s.body}>Room for {n}</Text>
          </View>
        ))}
        <Text style={s.small}>Small circles within wider ones. You choose who belongs.</Text>
      </View>
      <View style={{ gap: 12 }}>
        <Text style={s.label}>Your AT Protocol handle</Text>
        <Input
          accessibilityLabel="AT Protocol handle"
          placeholder="you.bsky.social"
          value={handle}
          onChangeText={setHandle}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          disabled={busy || !handle.trim()}
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
        <Text style={s.small}>
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
    </Page>
  );
}
