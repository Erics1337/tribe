import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useSession, navigateAfterLogin } from '../src/session';
import { Page, Header, ErrorText, Loading, Button } from '../src/ui';
export default function Return() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { complete } = useSession();
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (code) complete(code).then(navigateAfterLogin).catch(setError);
    else setError(new Error('Sign-in could not be completed.'));
  }, [code]);
  return (
    <Page>
      <Header title="Coming back to your people" />
      <ErrorText error={error} />
      {error ? <Button onPress={() => router.replace('/sign-in')}>Try again</Button> : <Loading />}
    </Page>
  );
}
