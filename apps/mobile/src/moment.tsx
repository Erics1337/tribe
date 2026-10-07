import { View, Text, Image, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { Post, Asset } from '@tribe/domain';
import { response } from './api';
import { Avatar, Icon, Loading, s, colors } from './ui';
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
    <View style={{ padding: 24, backgroundColor: colors.soft }}>
      <Text style={s.small}>This photo is unavailable.</Text>
    </View>
  ) : (
    <Loading />
  );
}
export function Moment({ post, onReact }: { post: Post; onReact?: () => void }) {
  return (
    <View
      style={{
        backgroundColor: colors.paper,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.line,
        overflow: 'hidden',
      }}
    >
      <View style={[s.between, { padding: 18 }]}>
        <View style={s.row}>
          <Avatar user={post.author} />
          <View>
            <Text style={s.label}>{post.author.displayName}</Text>
            <Text style={s.small}>
              {new Date(post.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}{' '}
              · Shared with you
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open moment and options"
          onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
          style={{ padding: 10 }}
        >
          <Icon name="ellipsis-horizontal" />
        </Pressable>
      </View>
      {post.media.slice(0, 1).map((m) => (
        <Photo key={m.id} asset={m} />
      ))}
      <View style={{ padding: 18, gap: 16 }}>
        {post.body && <Text style={[s.body, { color: colors.ink }]}>{post.body}</Text>}
        {post.media.length > 1 && (
          <Text style={s.small}>{post.media.length} photos · Open to see all</Text>
        )}
        <View style={s.between}>
          <View style={[s.row, { gap: 24 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={post.reacted ? 'Remove appreciation' : 'Appreciate moment'}
              onPress={onReact}
              style={[s.row, { minHeight: 44 }]}
            >
              <Icon
                name={post.reacted ? 'heart' : 'heart-outline'}
                color={post.reacted ? colors.green : colors.muted}
              />
              <Text style={s.small}>{post.reactionCount || ''}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Read and add comments"
              onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
              style={[s.row, { minHeight: 44 }]}
            >
              <Icon name="chatbubble-outline" color={colors.muted} />
              <Text style={s.small}>{post.commentCount || 'Say something'}</Text>
            </Pressable>
          </View>
          <Icon name="lock-closed-outline" color={colors.muted} size={16} />
        </View>
      </View>
    </View>
  );
}
