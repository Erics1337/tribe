import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSession } from "../src/hooks/use-session";
import { getAtprotoSignInAvailability, signInWithAtproto } from "../src/lib/atproto";
import { Button, Card, Field, Heading, Screen } from "../src/components/primitives";
import { palette, spacing } from "../src/theme/tokens";

export default function SignInScreen() {
  const { signInDemo, signInAtproto } = useSession();
  const [displayName, setDisplayName] = useState("Calm Friend");
  const [handle, setHandle] = useState("calm.friend");
  const [atprotoInput, setAtprotoInput] = useState("https://bsky.social");
  const [error, setError] = useState<string>();
  const [working, setWorking] = useState(false);
  const atprotoAvailability = getAtprotoSignInAvailability();

  async function handleDemoSignIn() {
    try {
      setWorking(true);
      setError(undefined);
      await signInDemo({ displayName, handle });
      router.replace("/");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to sign in.");
    } finally {
      setWorking(false);
    }
  }

  async function handleAtprotoSignIn() {
    try {
      setWorking(true);
      setError(undefined);
      const identity = await signInWithAtproto(atprotoInput);
      await signInAtproto(identity);
      router.replace("/");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to start AT Protocol sign in.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Screen>
      <Heading title="Tribe" subtitle="A smaller social layer built around the people you can actually hold onto." />
      <Card>
        <Text style={{ fontSize: 18, fontWeight: "700", color: palette.ink, marginBottom: spacing.sm }}>Start with a real identity</Text>
        <Text style={{ color: palette.dusk, marginBottom: spacing.md }}>
          Use your Bluesky handle, DID, or a PDS host. `https://bsky.social` opens the standard Bluesky sign-in screen.
        </Text>
        <Field value={atprotoInput} onChangeText={setAtprotoInput} placeholder="Handle, DID, or https://bsky.social" />
        <View style={{ height: spacing.sm }} />
        <Button
          label={working ? "Working…" : atprotoAvailability.available ? "Continue with AT Protocol" : "AT Protocol unavailable"}
          onPress={handleAtprotoSignIn}
          disabled={working || !atprotoAvailability.available}
        />
        {!atprotoAvailability.available ? (
          <Text style={{ color: palette.dusk, marginTop: spacing.sm }}>{atprotoAvailability.reason}</Text>
        ) : null}
      </Card>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: "700", color: palette.ink, marginBottom: spacing.sm }}>Local demo profile</Text>
        <View style={{ gap: spacing.sm }}>
          <Field value={displayName} onChangeText={setDisplayName} placeholder="Display name" />
          <Field value={handle} onChangeText={setHandle} placeholder="Handle" />
          <Button label={working ? "Working…" : "Enter the demo network"} onPress={handleDemoSignIn} tone="secondary" disabled={working} />
        </View>
      </Card>
      {error ? <Text style={{ color: palette.ember }}>{error}</Text> : null}
    </Screen>
  );
}
