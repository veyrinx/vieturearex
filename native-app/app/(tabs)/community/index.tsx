'use client';

import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Image,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { GlassCard, ContentCard, CompactCard, HeroCard } from '@/components/ui/GlassCard';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
  is_public: boolean;
  category: string;
}

async function fetchCommunities(): Promise<CommunityItem[]> {
  const res = await fetch(`${API_BASE}/community?limit=30`);
  if (!res.ok) throw new Error('Failed to fetch communities');
  const data = await res.json();
  return data.data ?? data;
}

async function fetchTrendingPosts() {
  const res = await fetch(`${API_BASE}/community/posts/trending?limit=5`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? data;
}

export default function CommunityScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'discover' | 'my' | 'trending'>('discover');

  const { data: communities, isLoading, error, refetch } = useQuery({
    queryKey: ['communities'],
    queryFn: fetchCommunities,
  });

  const { data: trendingPosts } = useQuery({
    queryKey: ['trending-posts'],
    queryFn: fetchTrendingPosts,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const { colors, typography, spacing } = theme;

  const filteredCommunities = communities?.filter(c => 
    selectedTab === 'discover' ? !c.is_joined : c.is_joined
  ) ?? [];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant }]}>Đang tải cộng đồng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
            progressViewOffset={60}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Header with Create Button */}
        <AnimatedView enterAnimation="fade" delay={100} style={styles.headerSection}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[typography.headlineSmall, { color: colors.onSurface }]}>Cộng đồng FF</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>
                Kết nối, chia sẻ, cùng phát triển
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/community/create')}
            >
              <Ionicons name="add" size={22} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>

          {/* Tab Bar */}
          <AnimatedView enterAnimation="slideUp" delay={150} style={styles.tabBar}>
            {[
              { key: 'discover', label: 'Khám phá', icon: 'compass' },
              { key: 'my', label: 'Của tôi', icon: 'folder' },
              { key: 'trending', label: 'Xu hướng', icon: 'trending-up' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabItem,
                  selectedTab === tab.key && styles.tabItemActive,
                  { backgroundColor: selectedTab === tab.key ? colors.primaryContainer : 'transparent' }
                ]}
                onPress={() => setSelectedTab(tab.key as any)}
                activeOpacity={0.8}
              >
                <Ionicons name={tab.icon} size={20} color={selectedTab === tab.key ? colors.primary : colors.onSurfaceVariant} />
                <Text style={[
                  typography.labelMedium,
                  { color: selectedTab === tab.key ? colors.primary : colors.onSurfaceVariant, marginLeft: 6 }
                ]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </AnimatedView>
        </AnimatedView>

        {/* Trending Posts */}
        {selectedTab === 'trending' && trendingPosts?.length > 0 && (
          <AnimatedView enterAnimation="slideUp" delay={200} style={styles.trendingSection}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.titleLarge, { color: colors.onSurface }]}>Bài viết hot</Text>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={trendingPosts}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.trendingCarousel}
              renderItem={({ item, index }) => (
                <AnimatedView enterAnimation="slideRight" delay={250 + index * 50} style={styles.trendingCardContainer}>
                  <TouchableOpacity style={styles.trendingCard} activeOpacity={0.9}>
                    {item.thumbnail_url && (
                      <Image source={{ uri: item.thumbnail_url }} style={styles.trendingImage} resizeMode="cover" />
                    )}
                    <View style={styles.trendingOverlay}>
                      <Text style={[typography.labelSmall, { color: 'rgba(255,255,255,0.8)', marginBottom: spacing.xs }]}>
                        {item.community_title || 'Cộng đồng'}
                      </Text>
                      <Text style={[typography.titleMedium, { color: '#fff', marginBottom: spacing.sm }]}>{item.title}</Text>
                      <View style={styles.trendingMeta}>
                        <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.7)' }]}>
                          {item.author_name} • {formatRelativeTime(item.created_at)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </AnimatedView>
              )}
            />
          </AnimatedView>
        )}

        {/* Communities */}
        <AnimatedView enterAnimation="fade" delay={selectedTab === 'trending' ? 300 : 200} style={styles.communitiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.titleLarge, { color: colors.onSurface }]}>
              {selectedTab === 'discover' ? 'Cộng đồng gợi ý' : 'Cộng đồng của bạn'}
            </Text>
            {selectedTab === 'discover' && (
              <TouchableOpacity onPress={() => router.push('/community/all')}>
                <Text style={[typography.labelMedium, { color: colors.primary }]}>Xem tất cả</Text>
              </TouchableOpacity>
            )}
          </View>

          {error ? (
            <ContentCard style={styles.errorCard}>
              <View style={styles.errorContent}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.onSurfaceVariant} />
                <Text style={[typography.titleMedium, { color: colors.onSurface, marginTop: spacing.sm }]}>Không thể tải cộng đồng</Text>
                <TouchableOpacity 
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                  onPress={onRefresh}
                  marginTop={spacing.md}
                >
                  <Text style={[typography.labelMedium, { color: colors.onPrimary }]}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            </ContentCard>
          ) : (
            <View style={styles.communitiesList}>
              {filteredCommunities.length === 0 ? (
                <ContentCard style={styles.emptyCard}>
                  <View style={styles.emptyContent}>
                    <Ionicons name={selectedTab === 'discover' ? 'compass-outline' : 'folder-outline'} size={48} color={colors.onSurfaceVariant} />
                    <Text style={[typography.titleMedium, { color: colors.onSurface, marginTop: spacing.sm }]}>
                      {selectedTab === 'discover' ? 'Chưa có cộng đồng gợi ý' : 'Bạn chưa tham gia cộng đồng nào'}
                    </Text>
                    <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                      {selectedTab === 'discover' ? 'Hãy quay lại sau hoặc tạo mới!' : 'Khám phá và tham gia ngay hôm nay'}
                    </Text>
                    {selectedTab === 'discover' && (
                      <TouchableOpacity 
                        style={[styles.ctaButton, { backgroundColor: colors.primary, marginTop: spacing.md }]}
                        onPress={() => router.push('/community/create')}
                      >
                        <Text style={[typography.labelMedium, { color: colors.onPrimary }]}>Tạo cộng đồng mới</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ContentCard>
              ) : (
                <FlatList
                  data={filteredCommunities}
                  keyExtractor={item => item.id}
                  renderItem={({ item, index }) => (
                    <AnimatedView 
                      key={item.id} 
                      enterAnimation="slideUp" 
                      delay={200 + index * 40}
                      style={styles.communityCardContainer}
                    >
                      <TouchableOpacity
                        style={styles.communityCard}
                        onPress={() => router.push(`/community/${item.slug}`)}
                        activeOpacity={0.85}
                      >
                        {item.thumbnail_url && (
                          <Image source={{ uri: item.thumbnail_url }} style={styles.communityImage} resizeMode="cover" />
                        )}
                        <View style={styles.communityContent}>
                          <View style={styles.communityTopRow}>
                            <View style={[styles.categoryChip, { backgroundColor: colors.secondaryContainer }]}>
                              <Text style={[typography.labelSmall, { color: colors.secondary, fontWeight: '600' }]}>{item.category}</Text>
                            </View>
                            <View style={[styles.visibilityChip, { backgroundColor: item.is_public ? colors.successContainer : colors.warningContainer }]}>
                              <Ionicons name={item.is_public ? 'lock-open' : 'lock-closed'} size={12} color={item.is_public ? colors.success : colors.warning} />
                              <Text style={[typography.labelSmall, { color: item.is_public ? colors.onSuccessContainer : colors.onWarningContainer, fontWeight: '600', marginLeft: 4 }]}>
                                {item.is_public ? 'Công khai' : 'Riêng tư'}
                              </Text>
                            </View>
                          </View>
                          <Text style={[typography.titleMedium, { color: colors.onSurface, marginTop: spacing.sm, marginBottom: spacing.xs }]}>{item.title}</Text>
                          {item.description && (
                            <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginBottom: spacing.sm }]}>{item.description}</Text>
                          )}
                          <View style={styles.communityMeta}>
                            <View style={styles.metaItem}>
                              <Ionicons name="people" size={14} color={colors.onSurfaceVariant} />
                              <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, marginLeft: 4 }]}>{formatNumber(item.member_count)} thành viên</Text>
                            </View>
                            <View style={styles.metaItem}>
                              <Ionicons name="chatbubble" size={14} color={colors.onSurfaceVariant} />
                              <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, marginLeft: 4 }]}>{formatNumber(item.post_count)} bài</Text>
                            </View>
                          </View>
                          <TouchableOpacity 
                            style={[
                              styles.joinButton,
                              item.is_joined ? styles.joinButtonJoined : {},
                              { backgroundColor: item.is_joined ? 'transparent' : colors.primary, borderColor: item.is_joined ? colors.outlineVariant : colors.primary }
                            ]}
                            onPress={() => { /* TODO: join/leave */ }}
                            activeOpacity={0.8}
                          >
                            <Text style={[
                              typography.labelMedium,
                              { color: item.is_joined ? colors.onSurface : colors.onPrimary, fontWeight: '600' }
                            ]}>
                              {item.is_joined ? 'Đã tham gia' : 'Tham gia'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </AnimatedView>
                  )}
                />
              )}
            </View>
          )}
        </AnimatedView>

        {/* Quick Stats Footer */}
        <AnimatedView enterAnimation="fade" delay={400} style={styles.statsFooter}>
          <ContentCard style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={28} color={colors.primary} />
                <Text style={[typography.headlineSmall, { color: colors.onSurface, marginTop: spacing.xs }]}>{formatNumber(communities?.reduce((a, b) => a + b.member_count, 0) || 0)}</Text>
                <Text style={[typography.labelMedium, { color: colors.onSurfaceVariant }]}>Thành viên</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbubbles" size={28} color={colors.secondary} />
                <Text style={[typography.headlineSmall, { color: colors.onSurface, marginTop: spacing.xs }]}>{formatNumber(communities?.reduce((a, b) => a + b.post_count, 0) || 0)}</Text>
                <Text style={[typography.labelMedium, { color: colors.onSurfaceVariant }]}>Bài viết</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="layers" size={28} color={colors.tertiary} />
                <Text style={[typography.headlineSmall, { color: colors.onSurface, marginTop: spacing.xs }]}>{communities?.length || 0}</Text>
                <Text style={[typography.labelMedium, { color: colors.onSurfaceVariant }]}>Cộng đồng</Text>
              </View>
            </View>
          </ContentCard>
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes}ph`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}ngày`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollContent: { paddingBottom: 100 },
  headerSection: { paddingHorizontal: 16, paddingBottom: 8 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  createButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, marginTop: 12 },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  tabItemActive: { },
  trendingSection: { paddingHorizontal: 16, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  trendingCarousel: { paddingHorizontal: 16, gap: 12 },
  trendingCardContainer: { width: 280 },
  trendingCard: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  trendingImage: { ...StyleSheet.absoluteFillObject },
  trendingOverlay: { flex: 1, padding: 16, justifyContent: 'flex-end' },
  trendingMeta: { marginTop: 8 },
  communitiesSection: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  communitiesList: { gap: 12 },
  communityCardContainer: {},
  communityCard: { flexDirection: 'row', borderRadius: 14, overflow: 'hidden' },
  communityImage: { width: 80, height: 80 },
  communityContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  communityTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  categoryChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  visibilityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  communityMeta: { flexDirection: 'row', gap: 16, marginVertical: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  joinButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start', marginTop: 8 },
  joinButtonJoined: { backgroundColor: 'transparent' },
  errorCard: { marginHorizontal: 16, padding: 24, marginTop: 8 },
  errorContent: { alignItems: 'center', gap: 12 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  emptyCard: { marginHorizontal: 16, padding: 32, marginTop: 8 },
  emptyContent: { alignItems: 'center', gap: 12 },
  ctaButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  statsFooter: { paddingHorizontal: 16, marginTop: 24, marginBottom: 40 },
  statsCard: { padding: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
});

import { useState } from 'react';