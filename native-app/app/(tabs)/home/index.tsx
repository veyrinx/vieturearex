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
import { GlassCard, HeroCard, ContentCard } from '@/components/ui/GlassCard';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

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

interface EventItem {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  start_at: string;
  end_at: string;
  status: 'upcoming' | 'live' | 'ended';
  server: string;
}

async function fetchHomeData() {
  const [newsRes, eventsRes] = await Promise.all([
    fetch(`${API_BASE}/news?limit=5`),
    fetch(`${API_BASE}/events?limit=4&status=live,upcoming`),
  ]);
  
  const [newsData, eventsData] = await Promise.all([
    newsRes.json(),
    eventsRes.json(),
  ]);
  
  return {
    news: newsData.data ?? newsData,
    events: eventsData.data ?? eventsData,
  };
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['home'],
    queryFn: fetchHomeData,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const { colors, typography, spacing, elevation } = theme;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant }]}>Đang tải nội dung...</Text>
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
        {/* Hero Section */}
        <AnimatedView enterAnimation="fade" delay={100} style={styles.heroSection}>
          <HeroCard style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Ionicons name="flame" size={16} color={colors.primary} />
                <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '600' }]}>Sự kiện đang diễn ra</Text>
              </View>
              <Text style={[typography.headlineMedium, { color: colors.onSurface, marginTop: spacing.sm }]}>
                Free Fire OB47 Update
              </Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: spacing.xs, marginBottom: spacing.md }]}>
                Bản cập nhật lớn nhất năm 2024 với mode mới, skin độc quyền và cân bằng vũ khí hoàn toàn mới.
              </Text>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={[typography.labelLarge, { color: colors.primary, fontWeight: '700' }]}>OB47</Text>
                  <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant }]}>Version</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={[typography.labelLarge, { color: colors.onSurface, fontWeight: '700' }]}>New</Text>
                  <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant }]}>Mode</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={[typography.labelLarge, { color: colors.onSurface, fontWeight: '700' }]}>50+</Text>
                  <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant }]}>Skins</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.heroButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/events/ob47-update')}
              >
                <Text style={[typography.labelLarge, { color: colors.onPrimary, fontWeight: '600' }]}>Xem chi tiết</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          </HeroCard>
        </AnimatedView>

        {/* Quick Actions */}
        <AnimatedView enterAnimation="slideUp" delay={200} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.titleLarge, { color: colors.onSurface }]}>Truy cập nhanh</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action, index) => (
              <AnimatedView 
                key={action.id} 
                enterAnimation="scale" 
                delay={300 + index * 50}
                style={styles.quickActionCard}
              >
                <TouchableOpacity
                  style={styles.quickActionInner}
                  onPress={() => router.push(action.href)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                    <Ionicons name={action.icon} size={24} color={action.color} />
                  </View>
                  <Text style={[typography.titleSmall, { color: colors.onSurface, marginTop: spacing.sm }]}>{action.label}</Text>
                  <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 2 }]}>{action.desc}</Text>
                </TouchableOpacity>
              </AnimatedView>
            ))}
          </View>
        </AnimatedView>

        {/* Live Events Carousel */}
        {data?.events?.length > 0 && (
          <AnimatedView enterAnimation="slideUp" delay={400} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.titleLarge, { color: colors.onSurface }]}>Sự kiện đang diễn ra</Text>
            </View>
            <View style={styles.eventsCarousel} horizontal showsHorizontalScrollIndicator={false}>
              {data.events.map((event, index) => (
                <AnimatedView 
                  key={event.id} 
                  enterAnimation="slideRight" 
                  delay={500 + index * 50}
                  style={styles.eventCardContainer}
                >
                  <TouchableOpacity
                    style={styles.eventCard}
                    onPress={() => router.push(`/events/${event.slug}`)}
                    activeOpacity={0.9}
                  >
                    {event.thumbnail_url && (
                      <Image source={{ uri: event.thumbnail_url }} style={styles.eventImage} resizeMode="cover" />
                    )}
                    <View style={styles.eventOverlay}>
                      <View style={[styles.eventStatusBadge, { backgroundColor: getStatusColor(event.status) }]}>
                        <Text style={[typography.labelSmall, { color: '#fff', fontWeight: '700' }]}>
                          {getStatusLabel(event.status)}
                        </Text>
                      </View>
                      <View style={styles.eventInfo}>
                        <Text style={[styles.eventServer, { color: '#fff' }]}>{event.server}</Text>
                        <Text style={[typography.titleMedium, { color: '#fff', marginTop: spacing.xs }]}>{event.title}</Text>
                        <Text style={[typography.bodySmall, { color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs }]}>
                          {formatDateRange(event.start_at, event.end_at)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </AnimatedView>
              ))}
            </View>
          </AnimatedView>
        )}

        {/* Latest News */}
        <AnimatedView enterAnimation="slideUp" delay={500} style={styles.section}>
          <View style={styles.sectionHeaderWithAction}>
            <Text style={[typography.titleLarge, { color: colors.onSurface }]}>Tin tức mới nhất</Text>
            <TouchableOpacity 
              onPress={() => router.push('/news')}
              style={styles.seeAllButton}
            >
              <Text style={[typography.labelMedium, { color: colors.primary, fontWeight: '600' }]}>Xem tất cả</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          {error ? (
            <ContentCard style={styles.errorCard}>
              <View style={styles.errorContent}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.onSurfaceVariant} />
                <Text style={[typography.titleMedium, { color: colors.onSurface, marginTop: spacing.sm }]}>Không thể tải tin tức</Text>
                <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>Kiểm tra kết nối và thử lại</Text>
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
              {data?.news?.map((news, index) => (
                <AnimatedView 
                  key={news.id} 
                  enterAnimation="slideUp" 
                  delay={600 + index * 50}
                  style={styles.newsCardContainer}
                >
                  <TouchableOpacity
                    style={styles.newsCard}
                    onPress={() => router.push(`/news/${news.slug}`)}
                    activeOpacity={0.9}
                  >
                    {news.thumbnail_url && (
                      <Image source={{ uri: news.thumbnail_url }} style={styles.newsImage} resizeMode="cover" />
                    )}
                    <View style={styles.newsContent}>
                      <View style={styles.newsMeta}>
                        <View style={[styles.categoryChip, { backgroundColor: colors.primaryContainer }]}>
                          <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '600' }]}>{news.category}</Text>
                        </View>
                        <Text style={[styles.newsTime, { color: colors.onSurfaceVariant }]}>{formatRelativeTime(news.published_at)}</Text>
                      </View>
                      <Text style={[typography.titleSmall, { color: colors.onSurface, marginTop: spacing.xs, marginBottom: spacing.xs }]}>{news.title}</Text>
                      {news.excerpt && (
                        <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginBottom: spacing.sm }]}>{news.excerpt}</Text>
                      )}
                      <View style={styles.newsFooter}>
                        <Text style={[styles.newsViews, { color: colors.onSurfaceVariant }]}>
                          <Ionicons name="eye-outline" size={14} color={colors.onSurfaceVariant} />
                          {formatNumber(news.view_count)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </AnimatedView>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.loadMoreButton, { borderColor: colors.outlineVariant }]}
            onPress={() => router.push('/news')}
          >
            <Text style={[typography.labelLarge, { color: colors.onSurfaceVariant }]}>Tải thêm tin tức</Text>
            <Ionicons name="chevron-down" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </AnimatedView>

        {/* Footer CTA */}
        <AnimatedView enterAnimation="fade" delay={800} style={styles.footerCTA}>
          <ContentCard style={styles.ctaCard}>
            <View style={styles.ctaContent}>
              <Ionicons name="star" size={32} color={colors.primary} />
              <Text style={[typography.titleMedium, { color: colors.onSurface, marginTop: spacing.sm }]}>Tham gia Arex Prime</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: spacing.xs, textAlign: 'center' }]}>
                Mở khóa tính năng độc quyền, skin miễn phí, ưu đãi nạp thẻ và nhiều hơn nữa.
              </Text>
              <TouchableOpacity 
                style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/prime-store')}
                marginTop={spacing.md}
              >
                <Text style={[typography.labelLarge, { color: colors.onPrimary, fontWeight: '600' }]}>Xem gói Prime</Text>
              </TouchableOpacity>
            </View>
          </ContentCard>
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const QUICK_ACTIONS = [
  { id: 'news', label: 'Tin tức', desc: 'Cập nhật mới nhất', icon: 'newspaper', color: '#3B82F6', href: '/news' },
  { id: 'events', label: 'Sự kiện', desc: 'Lịch thi đấu & live', icon: 'calendar', color: '#F7931A', href: '/events' },
  { id: 'community', label: 'Cộng đồng', desc: 'Tham gia thảo luận', icon: 'people', color: '#10B981', href: '/community' },
  { id: 'tools', label: 'Công cụ FF', desc: 'Độ nhạy, tier list...', icon: 'build', color: '#8B5CF6', href: '/tools' },
  { id: 'profile', label: 'Hồ sơ', desc: 'Quản lý tài khoản', icon: 'person', color: '#EC4899', href: '/profile' },
  { id: 'prime', label: 'Cửa hàng Prime', desc: 'Gói ưu đãi độc quyền', icon: 'star', color: '#F59E0B', href: '/prime-store' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'live': return '#EF4444';
    case 'upcoming': return '#3B82F6';
    default: return '#9CA3AF';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'live': return 'ĐANG LIVE';
    case 'upcoming': return 'SẮP DIỄN RA';
    default: return 'ĐÃ KẾT THÚC';
  }
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startStr = startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const endStr = endDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `${startStr} - ${endStr}`;
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
  heroSection: { paddingHorizontal: 16, marginBottom: 8 },
  heroCard: { overflow: 'hidden' },
  heroContent: { padding: 20 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1 },
  heroStat: { alignItems: 'center' },
  heroButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { marginBottom: 16 },
  sectionHeaderWithAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  quickActionCard: { width: '48%', aspectRatio: 1 },
  quickActionInner: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  quickActionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  eventsCarousel: { paddingHorizontal: 16, gap: 12 },
  eventCardContainer: { width: 280 },
  eventCard: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  eventImage: { ...StyleSheet.absoluteFillObject },
  eventOverlay: { flex: 1, padding: 16, justifyContent: 'flex-end' },
  eventStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  eventInfo: { marginTop: 8 },
  eventServer: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  newsList: { gap: 12 },
  newsCardContainer: { marginHorizontal: 16 },
  newsCard: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden' },
  newsImage: { width: 100, height: 100 },
  newsContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  newsMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  newsTime: { fontSize: 11, fontWeight: '500' },
  newsFooter: { borderTopWidth: 1, paddingTop: 8 },
  newsViews: { flexDirection: 'row', alignItems: 'center', gap: 4, fontSize: 11 },
  loadMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  errorCard: { marginHorizontal: 16, padding: 24 },
  errorContent: { alignItems: 'center', gap: 12 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  footerCTA: { paddingHorizontal: 16, marginTop: 24, marginBottom: 40 },
  ctaCard: { padding: 20 },
  ctaContent: { alignItems: 'center', gap: 12 },
  ctaButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
});