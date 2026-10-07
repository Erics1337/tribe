import { Text, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '../src/session';
import { api } from '../src/api';
import { Page, Header, Button, ErrorText, Icon, s, colors } from '../src/ui';
export default function Onboarding() {
  const { user, reload } = useSession();
  const done = useMutation({
    mutationFn: () => api('/me', 'PATCH', { onboarded: true }),
    onSuccess: async () => {
      await reload();
      router.replace('/circles');
    },
  });
  if (!user) return <Redirect href="/sign-in" />;
  return (
    <Page>
      <Header
        eyebrow="Welcome to Tribe"
        title="Start with your people."
        subtitle="You don't need a big network. A few familiar faces are enough."
      />
      {[
        [
          'people-outline',
          'Circles are yours',
          'Only you can see how you organize people. Nobody is notified when you move them.',
        ],
        [
          'lock-closed-outline',
          'Share with intention',
          'Choose a circle and check the names before sharing. Wider circles include the smaller ones.',
        ],
        [
          'leaf-outline',
          'There’s room to breathe',
          'Catch up at your own pace. No streaks, no pressure to fill every space.',
        ],
      ].map(([icon, title, body]) => (
        <View key={title} style={s.card}>
          <Icon name={icon as any} color={colors.green} />
          <Text style={s.heading}>{title}</Text>
          <Text style={s.body}>{body}</Text>
        </View>
      ))}
      <Text style={s.small}>
        Our circle sizes are inspired by research on social attention. They're a tool for
        reflection, not a measure of how many friends you should have.
      </Text>
      <ErrorText error={done.error} />
      <Button disabled={done.isPending} onPress={() => done.mutate()}>
        Find your first people
      </Button>
    </Page>
  );
}
