import React, { useState, useEffect } from 'react';
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
  useWindowDimensions,
  type ColorValue,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Profile, Tier } from '@tribe/domain';
import { tiers, labels } from '@tribe/domain';
export const colors = {
  bg: '#F6F8F7',
  paper: '#FFFFFF',
  ink: '#182F29',
  muted: '#536B61',
  line: '#DDE6E1',
  green: '#275F49',
  greenPressed: '#1B4937',
  soft: '#E7F0EB',
  subtle: '#EFF3F1',
  disabled: '#E5EAE7',
  focus: '#275F49',
  danger: '#A63737',
  dangerSoft: '#F8EDEC',
};
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  heading: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.25,
    color: colors.ink,
  },
  body: { fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 24, color: colors.muted },
  small: { fontFamily: 'Manrope_500Medium', fontSize: 12, lineHeight: 19, color: colors.muted },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  section: { gap: 16 },
  field: { gap: 8 },
  input: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.ink,
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    minHeight: 52,
  },
  label: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, lineHeight: 20, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line },
  error: { color: colors.danger, fontFamily: 'Manrope_500Medium', fontSize: 14, lineHeight: 22 },
  pill: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 46,
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  person: { flex: 1, minWidth: 0, gap: 2 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    paddingVertical: 12,
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
export function Action({
  children,
  onPress,
  label,
  selected = false,
  disabled = false,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label?: string;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        { borderRadius: 12, minHeight: 48 },
        style,
        hovered && !disabled && { backgroundColor: selected ? colors.greenPressed : colors.subtle },
        pressed && !disabled && { backgroundColor: selected ? colors.greenPressed : colors.soft },
        focused &&
          Platform.OS === 'web' &&
          ({
            outlineStyle: 'solid',
            outlineWidth: 2,
            outlineColor: colors.focus,
            outlineOffset: 3,
          } as ViewStyle),
      ]}
    >
      {children}
    </Pressable>
  );
}
export function IconButton({
  name,
  onPress,
  label,
  disabled = false,
  selected = false,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  label: string;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Action
      label={label}
      onPress={onPress}
      disabled={disabled}
      selected={selected}
      style={{ minWidth: 48, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={name} color={selected ? colors.green : colors.muted} />
    </Action>
  );
}
export function Button({
  children,
  onPress,
  disabled = false,
  quiet = false,
  danger = false,
  icon,
  busy = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  quiet?: boolean;
  danger?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  busy?: boolean;
}) {
  const [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const unavailable = disabled || busy;
  const ink = unavailable
    ? colors.muted
    : quiet
      ? danger
        ? colors.danger
        : colors.green
      : colors.paper;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, busy }}
      onPress={onPress}
      disabled={unavailable}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 13,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: unavailable
            ? colors.disabled
            : quiet
              ? danger
                ? colors.dangerSoft
                : colors.soft
              : danger
                ? colors.danger
                : pressed || hovered
                  ? colors.greenPressed
                  : colors.green,
        },
        quiet && (pressed || hovered) && !unavailable && { backgroundColor: colors.disabled },
        focused &&
          Platform.OS === 'web' &&
          ({
            outlineStyle: 'solid',
            outlineWidth: 2,
            outlineColor: colors.focus,
            outlineOffset: 3,
          } as ViewStyle),
      ]}
    >
      {busy ? (
        <ActivityIndicator color={ink} size="small" />
      ) : (
        icon && <Icon name={icon} size={18} color={ink} />
      )}
      <Text
        style={{
          fontFamily: 'Manrope_600SemiBold',
          fontSize: 14,
          lineHeight: 20,
          color: ink,
          textAlign: 'center',
          flexShrink: 1,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Input(props: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      selectionColor={colors.green}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[
        s.input,
        props.multiline && { textAlignVertical: 'top', minHeight: 104 },
        focused && {
          borderColor: colors.focus,
          borderWidth: 2,
          paddingHorizontal: 15,
          paddingVertical: 13,
        },
        props.editable === false && { backgroundColor: colors.subtle },
        props.style,
      ]}
    />
  );
}
export function Page({
  children,
  back = false,
  maxWidth = 680,
  feedback,
}: {
  children: React.ReactNode;
  back?: boolean;
  maxWidth?: number;
  feedback?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={s.page} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          s.container,
          {
            maxWidth,
            paddingHorizontal: width < 360 ? 16 : 24,
            paddingTop: width >= 900 ? 40 : 24,
          },
        ]}
      >
        {back && (
          <Action
            label="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={[s.row, { alignSelf: 'flex-start', paddingRight: 12 }]}
          >
            <Icon name="chevron-back-outline" size={20} />
            <Text style={s.label}>Back</Text>
          </Action>
        )}
        {children}
      </ScrollView>
      {feedback && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            bottom: 16 + insets.bottom,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            alignItems: 'center',
          }}
        >
          <View style={{ width: '100%', maxWidth: Math.min(maxWidth - 32, 640) }}>{feedback}</View>
        </View>
      )}
    </SafeAreaView>
  );
}
export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      {subtitle && <Text style={[s.body, { maxWidth: 520 }]}>{subtitle}</Text>}
    </View>
  );
}
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={s.heading}>
          {title}
        </Text>
        {description && <Text style={s.body}>{description}</Text>}
      </View>
      {children}
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
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user.avatarUrl]);
  return user.avatarUrl && !failed ? (
    <Image
      accessibilityLabel={user.displayName}
      source={{ uri: user.avatarUrl }}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.soft }}
    />
  ) : (
    <View
      accessibilityLabel={user.displayName}
      style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[s.heading, { fontSize: size * 0.35, color: colors.green }]}>
        {user.displayName.slice(0, 1)}
      </Text>
    </View>
  );
}
export function ErrorText({ error }: { error: unknown }) {
  return error ? (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ backgroundColor: colors.dangerSoft, padding: 16, borderRadius: 12 }}
    >
      <Text style={s.error}>{error instanceof Error ? error.message : String(error)}</Text>
    </View>
  ) : null;
}
export function Feedback({
  message,
  error,
  onDismiss,
}: {
  message?: string;
  error?: unknown;
  onDismiss: () => void;
}) {
  const text = error ? (error instanceof Error ? error.message : String(error)) : message;
  if (!text) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        s.row,
        {
          padding: 12,
          paddingLeft: 16,
          borderRadius: 16,
          backgroundColor: error ? colors.dangerSoft : colors.soft,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.green,
        },
      ]}
    >
      <Icon
        name={error ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        color={error ? colors.danger : colors.green}
      />
      <Text style={[s.body, { flex: 1, color: error ? colors.danger : colors.green }]}>{text}</Text>
      <IconButton name="close-outline" label="Dismiss message" onPress={onDismiss} />
    </View>
  );
}
export function Loading() {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ paddingVertical: 24, gap: 12 }}
    >
      {[100, 72, 88].map((width, i) => (
        <View
          key={i}
          style={{
            height: i ? 14 : 20,
            width: `${width}%`,
            borderRadius: 6,
            backgroundColor: colors.line,
          }}
        />
      ))}
    </View>
  );
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
    <View style={{ paddingVertical: 36, gap: 14, alignItems: 'center' }}>
      <Icon name={icon} size={32} color={colors.green} />
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
      contentContainerStyle={{ gap: 6, padding: 3 }}
    >
      {(all ? ['all', ...tiers] : tiers).map((t) => (
        <Action
          key={t}
          selected={t === value}
          onPress={() => onChange(t as Tier | 'all')}
          style={[s.pill, { backgroundColor: t === value ? colors.green : colors.subtle }]}
        >
          <Text
            style={[s.label, { fontSize: 13, color: t === value ? colors.paper : colors.muted }]}
          >
            {t === 'all' ? 'All moments' : labels[t as Tier]}
          </Text>
        </Action>
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
