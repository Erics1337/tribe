import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, spacing } from "../theme/tokens";

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: palette.paper, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}
    >
      {children}
    </SafeAreaView>
  );
}

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ fontSize: 34, lineHeight: 38, color: palette.ink, fontWeight: "800" }}>{title}</Text>
      {subtitle ? <Text style={{ color: palette.dusk, marginTop: spacing.xs, fontSize: 16 }}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        borderRadius: 24,
        padding: spacing.md,
        backgroundColor: palette.clay,
        borderWidth: 1,
        borderColor: palette.line,
        marginBottom: spacing.md,
      }}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  tone = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const backgroundColor = tone === "primary" ? palette.ink : palette.paper;
  const color = tone === "primary" ? palette.paper : palette.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 16,
        backgroundColor: disabled ? palette.line : backgroundColor,
        borderWidth: tone === "secondary" ? 1 : 0,
        borderColor: palette.line,
        alignItems: "center",
      }}
    >
      <Text style={{ color, fontWeight: "700", fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.dusk}
      multiline={multiline}
      style={{
        backgroundColor: palette.paper,
        borderColor: palette.line,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: spacing.md,
        paddingVertical: multiline ? spacing.md : spacing.sm,
        minHeight: multiline ? 120 : 48,
        color: palette.ink,
      }}
    />
  );
}

export function Pill({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 999,
        backgroundColor: active ? palette.ink : palette.faint,
        borderWidth: 1,
        borderColor: active ? palette.ink : palette.line,
      }}
    >
      <Text style={{ color: active ? palette.paper : palette.ink, fontWeight: "700" }}>{label}</Text>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}
