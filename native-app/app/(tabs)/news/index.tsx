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
  Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { GlassCard, ContentCard, CompactCard } from '@/components/ui/GlassCard';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.arexnetwork.site/api';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  thumbnail_url: string | null;
  category: string;
  published_at: string;
  view_count: number;
}

async function fetchNews(page = 1): Promise<{ data: NewsItem[]; total: number }> {
  const res = await fetch(`${API_BASE}/news?limit=20&page=${page}`);
  if (!res.ok) throw new Error('Failed to fetch news');
  const data = await res.json();
  return { data: data.data ?? data, total: data.total ?? 0 };
}

export default function NewsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['news', page],
    queryFn: () => fetchNews(page),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setAllNews([]);
    await refetch();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await fetchNews(nextPage);
    setAllNews((prev) => [...prev, ...res.data]);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const { colors, typography, spacing } = theme;
  const news = page === 1 ? data?.data : allNews;

  const categories = ['Tất cả', 'Sự kiện', 'Cập nhật', 'Esports', 'Cộng đồng', 'Hướng dẫn'];
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  if (isLoading && page === 1) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.2}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Category Filter */}
        <AnimatedView enterAnimation="fade" delay={100} style={styles.categorySection}>
          <Text style={[typography.titleLarge, { color: colors.onSurface, marginBottom: spacing.sm }]}>Danh mục</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {categories.map((cat, index) => (
              <AnimatedView key={cat} enterAnimation="slideRight" delay={150 + index * 30} style={styles.categoryItem}>
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat ? styles.categoryChipActive : {},
                    { backgroundColor: selectedCategory === cat ? colors.primary : colors.surfaceVariant }
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    typography.labelMedium,
                    { color: selectedCategory === cat ? colors.onPrimary : colors.onSurfaceVariant }
                  ]}>{cat}</Text>
                </TouchableOpacity>
              </AnimatedView>
            ))}
          </ScrollView>
        </AnimatedView>

        {/* News List */}
        <AnimatedView enterAnimation="slideUp" delay={200} style={styles.newsSection}>
          {error && page === 1 ? (
            <ContentCard style={styles.errorCard}>
              <View style={styles.errorContent}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.onSurfaceVariant} />
                <Text style={[typography.titleMedium, { color: colors.onSurface, marginTop: spacing.sm }]}>Không thể tải tin tức</Text>
                <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: spacing.xs, textAlign: 'center' }]}>Kiểm tra kết nối Internet và thử lại</Text>
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
            <View style={styles.newsList}>
              {news?.map((newsItem, index) => (
                <AnimatedView 
                  key={newsItem.id} 
                  enterAnimation="slideUp" 
                  delay={300 + index * 30}
                  style={styles.newsCardContainer}
                >
                  <TouchableOpacity
                    style={styles.newsCard}
                    onPress={() => router.push(`/news/${newsItem.slug}`)}
                    activeOpacity={0.85}
                  >
                    {newsItem.thumbnail_url && (
                      <Image source={{ uri: newsItem.thumbnail_url }} style={styles.newsImage} resizeMode="cover" />
                    )}
                    <View style={styles.newsContent}>
                      <View style={styles.newsMeta}>
                        <View style={[styles.categoryChip, { backgroundColor: colors.primaryContainer }]}>
                          <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '600' }]}>{newsItem.category}</Text>
                        </View>
                        <Text style={[styles.newsTime, { color: colors.onSurfaceVariant }]}>{formatRelativeTime(newsItem.published_at)}</Text>
                      </View>
                      <Text style={[typography.titleMedium, { color: colors.onSurface, marginTop: spacing.sm, marginBottom: spacing.xs }]}>{newsItem.title}</Text>
                      {newsItem.excerpt && (
                        <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>{newsItem.excerpt}</Text>
                      )}
                      <View style={styles.newsFooter}>
                        <View style={styles.newsStat}>
                          <Ionicons name="eye-outline" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, marginLeft: 4 }]}>{formatNumber(newsItem.view_count)}</Text>
                        </View>
                        <View style={styles.newsStat}>
                          <Ionicons name="chatbubble-outline" size={16} color={colors.onSurfaceVariant} />
                          <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, marginLeft: 4 }]}>0</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.outline} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </AnimatedView>
              ))}

              {loadingMore && (
                <View style={styles.loadingMore}>
                  <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>Đang tải thêm...</Text>
                </View>
              )}

              {!news?.length && !error && !isLoading && (
                <ContentCard style={styles.emptyCard}>
                  <View style={styles.emptyContent}>
                    <Ionicons name="newspaper-outline" size={48} color={colors.onSurfaceVariant} />
                    <Text style={[typography.titleMedium, { color: colors.onSurface, marginTop: spacing.sm }]}>Chưa có tin tức</Text>
                    <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>Hãy quay lại sau nhé!</Text>
                  </View>
                </ContentCard>
              )}
            </View>
          )}
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
  skeletonCard: { 
    marginHorizontal: 16, 
    marginBottom: 12, 
    height: 120, 
    borderRadius: 12, 
    backgroundColor: '#E0E0E0' 
  },
  scrollContent: { paddingBottom: 100 },
  categorySection: { paddingHorizontal: 16, paddingBottom: 8 },
  categoryScroll: { paddingRight: 16, gap: 8 },
  categoryItem: { marginRight: 8 },
  categoryChip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1 
  },
  categoryChipActive: { 
    borderWidth: 0 
  },
  newsSection: { paddingHorizontal: 16, marginTop: 8 },
  newsList: { gap: 12 },
  newsCardContainer: {},
  newsCard: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden' },
  newsImage: { width: 100, height: 100 },
  newsContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  newsMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  categoryChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  newsTime: { fontSize: 11, fontWeight: '500' },
  newsFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 8, marginTop: 8 },
  newsStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  loadingMore: { padding: 24, alignItems: 'center' },
  errorCard: { marginHorizontal: 16, padding: 24, marginTop: 8 },
  errorContent: { alignItems: 'center', gap: 12 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  emptyCard: { marginHorizontal: 16, padding: 32, marginTop: 8 },
  emptyContent: { alignItems: 'center', gap: 12 },
});

import { useState } from 'react';