import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Animated, AccessibilityInfo } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { Post, Asset } from '@tribe/domain';
import { response } from './api';
import { Avatar, Icon, Loading, IconButton, Action, s, colors } from './ui';
export function Photo({ asset, path = '/media/' + asset.id }: { asset: Asset; path?: string }) {
  const q = useQuery({
    queryKey: ['photo', path],
    queryFn: async () => {
      const r = await response(path);
      const bytes = new Uint8Array(await r.arrayBuffer());
      let chars = '';
      for (let i = 0; i < bytes.length; i += 8192)
        chars += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return 'data:image/jpeg;base64,' + btoa(chars);
    },
    retry: false,
  });
  const frame = {
    width: '100%' as const,
    aspectRatio: Math.min(1.4, Math.max(0.8, asset.width / asset.height)),
    backgroundColor: colors.soft,
  };
  return q.data ? (
    <Image
      accessibilityLabel={asset.alt || 'Shared photo'}
      source={{ uri: q.data }}
      style={{
        width: '100%',
        aspectRatio: Math.min(1.4, Math.max(0.8, asset.width / asset.height)),
        backgroundColor: colors.soft,
      }}
      resizeMode="cover"
    />
  ) : q.error ? (
    <View style={[frame, { padding: 24, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={s.small}>This photo is unavailable.</Text>
    </View>
  ) : (
    <View style={[frame, { padding: 24, justifyContent: 'center' }]}>
      <Loading />
    </View>
  );
}
export function Moment({ post, onReact }: { post: Post; onReact?: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(post.reacted);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (post.reacted && !previous.current && !reduced) {
      const animation = Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 100, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, speed: 28, bounciness: 3, useNativeDriver: true }),
      ]);
      animation.start();
      previous.current = post.reacted;
      return () => {
        animation.stop();
        scale.setValue(1);
      };
    }
    previous.current = post.reacted;
  }, [post.reacted, reduced, scale]);
  return (
    <View
      style={{
        backgroundColor: colors.paper,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.line,
        overflow: 'hidden',
      }}
    >
      <View style={[s.between, { padding: 18 }]}>
        <View style={[s.row, { flex: 1, minWidth: 0 }]}>
          <Avatar user={post.author} />
          <View style={s.person}>
            <Text style={s.label} numberOfLines={1}>
              {post.author.displayName}
            </Text>
            <Text style={s.small}>
              {new Date(post.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}{' '}
              · Shared with you
            </Text>
          </View>
        </View>
        <IconButton
          name="ellipsis-horizontal"
          label="Open moment and options"
          onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
        />
      </View>
      {post.media.slice(0, 1).map((m) => (
        <Photo key={m.id} asset={m} />
      ))}
      <View style={{ padding: 18, gap: 16 }}>
        {!!post.body && <Text style={[s.body, { color: colors.ink }]}>{post.body}</Text>}
        {post.media.length > 1 && (
          <Text style={s.small}>{post.media.length} photos · Open to see all</Text>
        )}
        <View style={s.between}>
          <View style={[s.row, { gap: 24 }]}>
            <Action
              label={post.reacted ? 'Remove appreciation' : 'Appreciate moment'}
              onPress={() => onReact?.()}
              disabled={!onReact}
              style={[s.row, { minHeight: 44 }]}
            >
              <Animated.View style={{ transform: [{ scale }] }}>
                <Icon
                  name={post.reacted ? 'heart' : 'heart-outline'}
                  color={post.reacted ? colors.green : colors.muted}
                />
              </Animated.View>
              <Text style={s.small}>{post.reactionCount || ''}</Text>
            </Action>
            <Action
              label="Read and add comments"
              onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
              style={[s.row, { minHeight: 44 }]}
            >
              <Icon name="chatbubble-outline" color={colors.muted} />
              <Text style={s.small}>{post.commentCount || 'Say something'}</Text>
            </Action>
          </View>
          <Icon name="lock-closed-outline" color={colors.muted} size={16} />
        </View>
      </View>
    </View>
  );
}
