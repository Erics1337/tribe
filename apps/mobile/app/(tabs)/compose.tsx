import { useState, useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Tier, Connection, Asset } from '@tribe/domain';
import { labels } from '@tribe/domain';
import { api, response, APIError } from '../../src/api';
import {
  Page,
  Header,
  Button,
  Input,
  TierPicker,
  Avatar,
  Icon,
  ErrorText,
  Empty,
  s,
  colors,
  IconButton,
} from '../../src/ui';
type Photo = { uri: string; alt: string; mimeType: string; asset?: Asset };
export default function Compose() {
  const [body, setBody] = useState(''),
    [tier, setTier] = useState<Tier>('inner'),
    [photos, setPhotos] = useState<Photo[]>([]),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [loaded, setLoaded] = useState(false),
    [retryKey, setRetryKey] = useState(() => Crypto.randomUUID());
  const query = useQueryClient();
  const audience = useQuery({
    queryKey: ['audience', tier],
    queryFn: () => api<{ version: string; recipients: Connection[] }>('/audience?tier=' + tier),
    enabled: review,
  });
  useEffect(() => {
    AsyncStorage.getItem('tribe.draft').then((raw) => {
      if (raw) {
        try {
          const p = JSON.parse(raw);
          setBody(p.body ?? '');
          setTier(p.tier ?? 'inner');
          setPhotos(p.photos ?? []);
        } catch {}
      }
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem('tribe.draft', JSON.stringify({ body, tier, photos }));
  }, [body, tier, photos, loaded]);
  const change = () => {
    setReview(false);
    setRetryKey(Crypto.randomUUID());
  };
  async function choose() {
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw new Error('Allow photo access to choose a moment, or share a text update.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 4 - photos.length,
        quality: 0.9,
      });
      if (!result.canceled) {
        setPhotos((p) =>
          [
            ...p,
            ...result.assets.map((a) => ({
              uri: a.uri,
              alt: '',
              mimeType: a.mimeType ?? 'image/jpeg',
            })),
          ].slice(0, 4),
        );
        change();
      }
    } catch (e) {
      setError(e);
    }
  }
  async function publish() {
    if (!audience.data) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded: Photo[] = [];
      for (const photo of photos) {
        if (photo.asset) {
          uploaded.push(photo);
          continue;
        }
        const blob = await (await fetch(photo.uri)).blob();
        const asset = (await (
          await response('/media', {
            method: 'POST',
            headers: {
              'Content-Type': photo.mimeType,
              'X-Photo-Alt': encodeURIComponent(photo.alt),
            },
            body: blob,
          })
        ).json()) as Asset;
        uploaded.push({ ...photo, asset });
        setPhotos([...uploaded, ...photos.slice(uploaded.length)]);
      }
      await api('/posts', 'POST', {
        body,
        tier,
        previewVersion: audience.data.version,
        mediaIds: uploaded.map((p) => p.asset!.id),
        idempotencyKey: retryKey,
      });
      setBody('');
      setPhotos([]);
      setReview(false);
      setRetryKey(Crypto.randomUUID());
      await AsyncStorage.removeItem('tribe.draft');
      await query.invalidateQueries({ queryKey: ['feed'] });
      router.push('/');
    } catch (e) {
      setError(e);
      if (e instanceof APIError && e.status === 409) {
        setReview(false);
        await audience.refetch();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Header
        title="An ordinary moment."
        subtitle="It doesn't need to be perfect. Just something you’d like your people to see."
      />
      <Input
        accessibilityLabel="Moment caption"
        value={body}
        onChangeText={(v) => {
          setBody(v);
          change();
        }}
        placeholder="What’s on your mind?"
        multiline
        maxLength={2000}
        style={{ minHeight: 164, textAlignVertical: 'top' }}
        editable={!busy}
      />
      <Text style={[s.small, { alignSelf: 'flex-end' }]}>{body.length} / 2,000</Text>
      {photos.map((p, i) => (
        <View key={p.uri} style={s.section}>
          <Image
            source={{ uri: p.uri }}
            accessibilityLabel={p.alt || 'Selected photo'}
            style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
          />
          <Input
            accessibilityLabel={'Description for photo ' + (i + 1)}
            placeholder="Describe this photo for screen readers"
            value={p.alt}
            maxLength={500}
            editable={!busy && !p.asset}
            onChangeText={(alt) => {
              setPhotos((ps) => ps.map((p, j) => (j === i ? { ...p, alt } : p)));
              change();
            }}
          />
          <Button
            quiet
            disabled={busy}
            onPress={() => {
              setPhotos((ps) => ps.filter((_, j) => j !== i));
              change();
            }}
          >
            Remove photo
          </Button>
        </View>
      ))}
      <Button quiet icon="image-outline" disabled={photos.length >= 4 || busy} onPress={choose}>
        Add photos · {photos.length}/4
      </Button>
      <View style={[s.section, { paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.line }]}>
        <View style={s.row}>
          <Icon name="lock-closed-outline" size={18} color={colors.green} />
          <Text style={s.heading}>Who’s this for?</Text>
        </View>
        <TierPicker
          value={tier}
          onChange={(t) => {
            setTier(t as Tier);
            change();
          }}
        />
        <Text style={s.small}>
          {labels[tier]} includes its smaller circles. The names below are the audience, not
          everyone who follows you.
        </Text>
      </View>
      <ErrorText error={error ?? audience.error} />
      {review && audience.data && (
        <View style={[s.card, { backgroundColor: colors.soft }]}>
          <View style={s.between}>
            <Text style={[s.heading, { flex: 1 }]}>
              Sharing with {audience.data.recipients.length}{' '}
              {audience.data.recipients.length === 1 ? 'person' : 'people'}
            </Text>
            <IconButton
              name="close-outline"
              label="Edit your moment"
              disabled={busy}
              onPress={() => setReview(false)}
            />
          </View>
          {audience.data.recipients.map((p) => (
            <View key={p.did} style={s.row}>
              <Avatar user={p} size={32} />
              <Text style={s.label}>{p.displayName}</Text>
            </View>
          ))}
          {!audience.data.recipients.length && (
            <Empty
              title="Invite someone first"
              body="Your audience needs at least one person who has joined Tribe."
            />
          )}
          <Text style={s.small}>
            Future additions won’t see this moment. Your circle name and recipient list stay
            private.
          </Text>
        </View>
      )}
      {review ? (
        <Button
          busy={busy}
          disabled={!audience.data?.recipients.length}
          onPress={publish}
          icon="arrow-up-outline"
        >
          {busy ? 'Sharing your moment…' : 'Share privately'}
        </Button>
      ) : (
        <Button
          disabled={busy || (!body.trim() && !photos.length)}
          onPress={() => {
            setReview(true);
            setError(null);
          }}
        >
          Review audience
        </Button>
      )}
      <Text style={[s.small, { textAlign: 'center' }]}>
        Your draft stays here until you’re ready.
      </Text>
    </Page>
  );
}
