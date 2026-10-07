import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  type ColorValue,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Profile, Tier } from '@tribe/domain';
import { tiers, labels } from '@tribe/domain';
export const colors = {
  bg: '#F6F8F7',
  paper: '#FFFFFF',
  ink: '#182F29',
  muted: '#667B73',
  line: '#DFE8E3',
  green: '#275F49',
  soft: '#E7F0EB',
  danger: '#A63737',
};
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  container: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 32,
    lineHeight: 42,
    letterSpacing: -1.1,
    color: colors.ink,
  },
  heading: { fontFamily: 'Manrope_600SemiBold', fontSize: 20, lineHeight: 28, color: colors.ink },
  body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 24, color: colors.muted },
  small: { fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 19, color: colors.muted },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    color: colors.ink,
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    minHeight: 52,
  },
  label: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line },
  error: { color: colors.danger, fontFamily: 'Manrope_500Medium', fontSize: 14, lineHeight: 22 },
  pill: { borderRadius: 100, paddingHorizontal: 16, paddingVertical: 11, minHeight: 44 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
export function Icon({
  name,
  size = 22,
  color = colors.ink,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: ColorValue;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({
  children,
  onPress,
  disabled = false,
  quiet = false,
  danger = false,
  icon,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  quiet?: boolean;
  danger?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          minHeight: 50,
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 14,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: quiet ? colors.soft : danger ? colors.danger : colors.green,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon && <Icon name={icon} size={18} color={quiet ? colors.green : 'white'} />}
      <Text
        style={{
          fontFamily: 'Manrope_600SemiBold',
          fontSize: 14,
          color: quiet ? colors.green : 'white',
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Input(props: TextInputProps) {
  return (
    <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.style]} />
  );
}
export function Page({ children, back = false }: { children: React.ReactNode; back?: boolean }) {
  return (
    <SafeAreaView style={s.page} edges={['top', 'left', 'right']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.container}>
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={[s.row, { minHeight: 44 }]}
          >
            <Icon name="arrow-back-outline" />
            <Text style={s.label}>Back</Text>
          </Pressable>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Header({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      {eyebrow && (
        <Text
          style={[s.small, { letterSpacing: 2, color: colors.green, textTransform: 'uppercase' }]}
        >
          {eyebrow}
        </Text>
      )}
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.body}>{subtitle}</Text>}
    </View>
  );
}
export function Avatar({
  user,
  size = 44,
}: {
  user: Pick<Profile, 'displayName' | 'avatarUrl'>;
  size?: number;
}) {
  return user.avatarUrl ? (
    <Image
      accessibilityLabel={user.displayName}
      source={{ uri: user.avatarUrl }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.heading, { fontSize: size * 0.35 }]}>{user.displayName.slice(0, 1)}</Text>
    </View>
  );
}
export function ErrorText({ error }: { error: unknown }) {
  return error ? (
    <Text accessibilityRole="alert" style={s.error}>
      {error instanceof Error ? error.message : String(error)}
    </Text>
  ) : null;
}
export function Loading() {
  return <ActivityIndicator color={colors.green} style={{ margin: 24 }} />;
}
export function Empty({
  title,
  body,
  icon = 'leaf-outline',
}: {
  title: string;
  body: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={[s.card, { paddingVertical: 40, alignItems: 'center' }]}>
      <View style={[s.avatar, { width: 64, height: 64, borderRadius: 32 }]}>
        <Icon name={icon} size={28} color={colors.green} />
      </View>
      <Text style={[s.heading, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[s.body, { textAlign: 'center', maxWidth: 330 }]}>{body}</Text>
    </View>
  );
}
export function TierPicker({
  value,
  onChange,
  all = false,
}: {
  value: Tier | 'all';
  onChange: (t: Tier | 'all') => void;
  all?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {(all ? ['all', ...tiers] : tiers).map((t) => (
        <Pressable
          key={t}
          accessibilityRole="button"
          accessibilityState={{ selected: t === value }}
          onPress={() => onChange(t as Tier | 'all')}
          style={[
            s.pill,
            {
              backgroundColor: t === value ? colors.green : colors.paper,
              borderColor: colors.line,
              borderWidth: t === value ? 0 : 1,
            },
          ]}
        >
          <Text style={[s.label, { color: t === value ? 'white' : colors.muted }]}>
            {t === 'all' ? 'All moments' : labels[t as Tier]}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export async function confirmAction(title: string, message: string) {
  if (Platform.OS === 'web') return window.confirm(title + '\n\n' + message);
  const { Alert } = await import('react-native');
  return new Promise<boolean>((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
