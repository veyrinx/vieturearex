'use client';

import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { Platform } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.arexnetwork.site/api';

interface CommunityItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string | null;
  member_count: number;
  post_count: number;
  is_joined: boolean;
}

async function fetchCommunities(): Promise<CommunityItem[]> {
  const res = await fetch(`${API_BASE}/community?limit=20`);
  if (!res.ok) throw new Error('Failed to fetch communities');
  const data = await res.json();
  return data.data ?? data;
}

export default function CommunityScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [refreshing, setRefreshing] = useState(false);

  const { data: communities, isLoading, error, refetch } = useQuery({
    queryKey: ['communities'],
    queryFn: fetchCommunities,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const colors = {
    background: isDark ? '#0a0a0a' : '#fafafa',
    card: isDark ? '#141414' : '#ffffff',
    border: isDark ? '#262626' : '#e4e4e7',
    text: isDark ? '#fafafa' : '#0a0a0a',
    textMuted: isDark ? '#a1a1aa' : '#71717a',
    primary: '#F7931A',
    primaryLight: 'rgba(247, 147, 26, 0.15)',
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingCenter}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Đang tải cộng đồng...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Cộng đồng Free Fire</Text>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>Tham gia thảo luận, chia sẻ kinh nghiệm</Text>
        </View>

        {error ? (
          <View style={styles.error}>
            <Text style={[styles.errorText, { color: colors.textMuted }]}>Không thể tải cộng đồng</Text>
            <TouchableOpacity onPress={onRefresh} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.communitiesList}>
            {communities?.map((community) => (
              <TouchableOpacity key={community.id} style={[styles.communityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {community.thumbnail_url && (
                  <Image source={{ uri: community.thumbnail_url }} style={styles.communityImage} resizeMode="cover" />
                )}
                <View style={styles.communityContent}>
                  <Text style={[styles.communityTitle, { color: colors.text }]}>{community.title}</Text>
                  <Text style={[styles.communityDesc, { color: colors.textMuted }]}>{community.description}</Text>
                  <View style={styles.communityMeta}>
                    <View style={styles.metaItem}>
                      <Icon name="users" size={14} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{formatNumber(community.member_count)} thành viên</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Icon name="message-square" size={14} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{formatNumber(community.post_count)} bài viết</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={[styles.joinBtn, { backgroundColor: community.is_joined ? colors.card : colors.primary, borderColor: community.is_joined ? colors.border : colors.primary }]}>
                  <Text style={[styles.joinBtnText, { color: community.is_joined ? colors.text : '#fff' }]}>
                    {community.is_joined ? 'Đã tham gia' : 'Tham gia'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  scrollContent: { paddingBottom: 100, paddingHorizontal: 16 },
  section: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionDesc: { fontSize: 13, marginTop: 4 },
  error: { alignItems: 'center', padding: 32 },
  errorText: { fontSize: 14, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  communitiesList: { gap: 12 },
  communityCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  communityImage: { width: 80, height: 80, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  communityContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  communityTitle: { fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 4 },
  communityDesc: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  communityMeta: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '500' },
  joinBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  joinBtnText: { fontSize: 12, fontWeight: '600' },
  loadingMore: { padding: 16, alignItems: 'center' },
});

function Icon({ name, size, color }: { name: string; size: number; color: string }) {
  const IconComponent = require('lucide-react-native')[name.charAt(0).toUpperCase() + name.slice(1)] || require('lucide-react-native').HelpCircle;
  return <IconComponent size={size} color={color} strokeWidth={2} />;
}