'use client';

import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { Platform } from 'react-native';

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
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

  const colors = {
    background: isDark ? '#0a0a0a' : '#fafafa',
    card: isDark ? '#141414' : '#ffffff',
    border: isDark ? '#262626' : '#e4e4e7',
    text: isDark ? '#fafafa' : '#0a0a0a',
    textMuted: isDark ? '#a1a1aa' : '#71717a',
    primary: '#F7931A',
  };

  const news = page === 1 ? data?.data : allNews;

  if (isLoading && page === 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingCenter}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Đang tải tin tức...</Text>
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.error}>
            <Text style={[styles.errorText, { color: colors.textMuted }]}>Không thể tải tin tức</Text>
            <TouchableOpacity onPress={onRefresh} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {news?.map((item) => (
          <TouchableOpacity key={item.id} style={[styles.newsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {item.thumbnail_url && (
              <Image source={{ uri: item.thumbnail_url }} style={styles.newsImage} resizeMode="cover" />
            )}
            <View style={styles.newsContent}>
              <Text style={[styles.newsCategory, { color: colors.primary }]}>{item.category}</Text>
              <Text style={[styles.newsTitle, { color: colors.text }]}>{item.title}</Text>
              {item.excerpt && (
                <Text style={[styles.newsExcerpt, { color: colors.textMuted }]}>{item.excerpt}</Text>
              )}
              <View style={styles.newsMeta}>
                <Text style={[styles.newsTime, { color: colors.textMuted }]}>{formatDate(item.published_at)}</Text>
                <Text style={[styles.newsViews, { color: colors.textMuted }]}>{formatNumber(item.view_count)} lượt xem</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {loadingMore && (
          <View style={styles.loadingMore}>
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Đang tải thêm...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes}p`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('vi-VN');
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
  error: { alignItems: 'center', padding: 32 },
  errorText: { fontSize: 14, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  newsCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newsImage: { width: 100, height: 100, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  newsContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  newsCategory: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  newsTitle: { fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 6 },
  newsExcerpt: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  newsMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  newsTime: { fontSize: 11, fontWeight: '500' },
  newsViews: { fontSize: 11, fontWeight: '500' },
  loadingMore: { padding: 16, alignItems: 'center' },
});