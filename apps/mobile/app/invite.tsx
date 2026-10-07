import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '../src/session';
import { api } from '../src/api';
import { Page, Header, Button, ErrorText, s } from '../src/ui';
import type { Profile } from '@tribe/domain';
import AsyncStorage from '@react-native-async-storage/async-storage';
export default function Invite() {
  const { token } = useLocalSearchParams<{ token: string }>(),
    { user } = useSession();
  const accept = useMutation({
    mutationFn: () =>
      api<{ inviter: Profile; message: string }>('/invitations/accept', 'POST', { token }),
  });
  return (
    <Page back>
      <Header
        eyebrow="A familiar face awaits"
        title="Come a little closer."
        subtitle="This invitation connects you with someone on Tribe. It doesn’t grant access to older private moments."
      />
      <ErrorText error={accept.error} />
      {accept.data ? (
        <>
          <Text style={s.heading}>{accept.data.inviter.displayName} invited you.</Text>
          <Text style={s.body}>
            Find their handle in Circles and choose where they belong: @{accept.data.inviter.handle}
          </Text>
          <Button onPress={() => router.push('/circles')}>Choose a circle</Button>
        </>
      ) : user ? (
        <Button disabled={accept.isPending || !token} onPress={() => accept.mutate()}>
          Accept invitation
        </Button>
      ) : (
        <Button
          onPress={async () => {
            await AsyncStorage.setItem('tribe.pending-invite', token);
            router.push('/sign-in');
          }}
        >
          Sign in to join
        </Button>
      )}
    </Page>
  );
}
