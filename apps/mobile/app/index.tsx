import { Redirect } from "expo-router";
import { useSession } from "../src/hooks/use-session";

export default function Index() {
  const { status, needsOnboarding } = useSession();

  if (status === "signedOut") {
    return <Redirect href="/sign-in" />;
  }

  if (needsOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/feed" />;
}
