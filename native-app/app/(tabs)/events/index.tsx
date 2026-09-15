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
import { GlassCard, HeroCard, ContentCard } from '@/components/ui/GlassCard';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.arexnetwork.site/api';

interface EventItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string | null;
  start_at: string;
  end_at: string;
  status: 'upcoming' | 'live' | 'ended';
  server: string;
  view_count: number;
}

async function fetchEvents(): Promise<EventItem[]> {
  const res = await fetch(`${API_BASE}/events?limit=30`);
  if (!res.ok) throw new Error('Failed to fetch events');
  const data = await res.json();
  return data.data ?? data;
}

const STATUS_CONFIG = {
  live: { label: 'ĐANG DIỄN RA', color: '#EF4444', bg: '#FEF2F2', icon: 'radio-button-on' },
  upcoming: { label: 'SẮP DIỄN RA', color: '#3B82F6', bg: '#EFF6FF', icon: 'time' },
  ended: { label: 'ĐÃ KẾT THÚC', color: '#9CA3AF', bg: '#F9FAFB', icon: 'checkmark-circle' },
};

export default function EventsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');

  const { data: events, isLoading, error, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const { colors, typography, spacing } = theme;

  const filteredEvents = events?.filter(e => 
    selectedFilter === 'all' || e.status === selectedFilter
  ) ?? [];

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const date = new Date(event.start_at).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, EventItem[]>);

  const sortedDates = Object.keys(groupedEvents).sort((a, b) => 
    new Date(groupedEvents[b][0].start_at).getTime() - new Date(groupedEvents[a][0].start_at).getTime()
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant }]}>Đang tải sự kiện...</Text>
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
        {/* Header with Stats */}
        <AnimatedView enterAnimation="fade" delay={100} style={styles.headerSection}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={[typography.headlineSmall, { color: colors.onSurface }]}>Sự kiện Free Fire</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>
                {events?.length || 0} sự kiện • {filteredEvents.length} hiển thị
              </Text>
            </View>
            <TouchableOpacity style={styles.filterButton} onPress={() => setSelectedFilter('all')}>
              <Ionicons name="funnel" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Status Filter Tabs */}
          <AnimatedView enterAnimation="slideUp" delay={150} style={styles.filterTabs}>
            {[
              { key: 'all', label: 'Tất cả', count: events?.length || 0 },
              { key: 'live', label: 'Live', count: events?.filter(e => e.status === 'live').length || 0 },
              { key: 'upcoming', label: 'Sắp tới', count: events?.filter(e => e.status === 'upcoming').length || 0 },
              { key: 'ended', label: 'Kết thúc', count: events?.filter(e => e.status === 'ended').length || 0 },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  selectedFilter === tab.key && styles.filterTabActive,
                  { backgroundColor: selectedFilter === tab.key ? colors.primary : colors.surfaceVariant }
                ]}
                onPress={() => setSelectedFilter(tab.key as any)}
                activeOpacity={0.8}
              >
                <Text style={[
                  typography.labelMedium,
                  { color: selectedFilter === tab.key ? colors.onPrimary : colors.onSurfaceVariant }
                ]}>{tab.label}</Text>
                {tab.count > 0 && (
                  <View style={[
                    styles.filterTabBadge,
                    { backgroundColor: selectedFilter === tab.key ? 'rgba(255,255,255,0.3)' : colors.primary }
                  ]}>
                    <Text style={[
                      typography.labelSmall,
                      { color: selectedFilter === tab.key ? colors.onPrimary : colors.primary, fontWeight: '700' }
                    ]}>{tab.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </AnimatedView>
        </AnimatedView>

        {/* Featured Live Event */}
        {events?.some(e => e.status === 'live') && (
          <AnimatedView enterAnimation="slideUp" delay={200} style={styles.featuredSection}>
            <Text style={[typography.titleLarge, { color: colors.onSurface, marginBottom: spacing.sm, paddingHorizontal: 16 }]}>Đang diễn ra ngay</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={events?.filter(e => e.status === 'live') || []}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.featuredCarousel}
              renderItem={({ item, index }) => (
                <AnimatedView enterAnimation="slideRight" delay={250 + index * 50} style={styles.featuredCardContainer}>
                  <TouchableOpacity
                    style={styles.featuredCard}
                    onPress={() => router.push(`/events/${item.slug}`)}
                    activeOpacity={0.9}
                  >
                    {item.thumbnail_url && (
                      <Image source={{ uri: item.thumbnail_url }} style={styles.featuredImage} resizeMode="cover" />
                    )}
                    <View style={styles.featuredOverlay}>
                      <View style={styles.featuredStatusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG.live.color }]}>
                          <Ionicons name={STATUS_CONFIG.live.icon} size={12} color="#fff" />
                          <Text style={[typography.labelSmall, { color: '#fff', fontWeight: '700', marginLeft: 4 }]}>{STATUS_CONFIG.live.label}</Text>
                        </View>
                        <View style={[styles.serverBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                          <Text style={[typography.labelSmall, { color: '#fff' }]}>{item.server}</Text>
                        </View>
                      </View>
                      <Text style={[typography.titleLarge, { color: '#fff', marginTop: spacing.md, marginBottom: spacing.xs }]}>{item.title}</Text>
                      <Text style={[typography.bodyMedium, { color: 'rgba(255,255,255,0.9)' }]}>{formatDateRange(item.start_at, item.end_at)}</Text>
                    </View>
                  </TouchableOpacity>
                </AnimatedView>
              )}
            />
          </AnimatedView>
        )}

        {/* Events by Date */}
        <AnimatedView enterAnimation="slideUp" delay={300} style={styles.eventsSection}>
          {error ? (
            <ContentCard style={styles.errorCard}>
              <View style={styles.errorContent}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.onSurfaceVariant} />
                <Text style={[typography.titleMedium, { color: colors.onSurface, marginTop: spacing.sm }]}>Không thể tải sự kiện</Text>
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
            <>
              {sortedDates.length === 0 ? (
                <ContentCard style={styles.emptyCard}>
                  <View style={styles.emptyContent}>
                    <Ionicons name="calendar-outline" size={48} color={colors.onSurfaceVariant} />
                    <Text style={[typography.titleMedium, { color: colors.onSurface, marginTop: spacing.sm }]}>Không có sự kiện nào</Text>
                    <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                      {selectedFilter !== 'all' ? 'Thử chọn bộ lọc khác' : 'Hiện tại chưa có sự kiện nào'}
                    </Text>
                  </View>
                </ContentCard>
              ) : (
                sortedDates.map((date, dateIndex) => (
                  <AnimatedView key={date} enterAnimation="fade" delay={400 + dateIndex * 50} style={styles.dateGroup}>
                    <View style={styles.dateHeader}>
                      <Text style={[typography.titleMedium, { color: colors.onSurface }]}>{date}</Text>
                      <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>{groupedEvents[date].length} sự kiện</Text>
                    </View>
                    <View style={styles.dateEvents}>
                      {groupedEvents[date].map((event, index) => (
                        <AnimatedView key={event.id} enterAnimation="slideUp" delay={450 + dateIndex * 50 + index * 40} style={styles.eventCardContainer}>
                          <TouchableOpacity
                            style={styles.eventCard}
                            onPress={() => router.push(`/events/${event.slug}`)}
                            activeOpacity={0.85}
                          >
                            {event.thumbnail_url && (
                              <Image source={{ uri: event.thumbnail_url }} style={styles.eventImage} resizeMode="cover" />
                            )}
                            <View style={styles.eventContent}>
                              <View style={styles.eventTopRow}>
                                <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[event.status].color }]}>
                                  <Ionicons name={STATUS_CONFIG[event.status].icon} size={12} color="#fff" />
                                  <Text style={[typography.labelSmall, { color: '#fff', fontWeight: '700', marginLeft: 4 }]}>{STATUS_CONFIG[event.status].label}</Text>
                                </View>
                                <View style={[styles.serverBadge, { backgroundColor: colors.surfaceVariant }]}>
                                  <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant }]}>{event.server}</Text>
                                </View>
                              </View>
                              <Text style={[typography.titleSmall, { color: colors.onSurface, marginTop: spacing.sm, marginBottom: spacing.xs }]}>{event.title}</Text>
                              <View style={styles.eventBottomRow}>
                                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>{formatDateRange(event.start_at, event.end_at)}</Text>
                                <View style={styles.eventStats}>
                                  <Ionicons name="eye-outline" size={14} color={colors.onSurfaceVariant} />
                                  <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, marginLeft: 4 }]}>{formatNumber(event.view_count)}</Text>
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        </AnimatedView>
                      ))}
                    </View>
                  </AnimatedView>
                ))
              )}
            </>
          )}
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startStr = startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const endStr = endDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `${startStr} - ${endStr}`;
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
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  filterButton: { padding: 8 },
  filterTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterTabActive: { borderWidth: 0 },
  filterTabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, minWidth: 20, alignItems: 'center' },
  featuredSection: { marginTop: 16 },
  featuredCarousel: { paddingHorizontal: 16, gap: 12 },
  featuredCardContainer: { width: 320 },
  featuredCard: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  featuredImage: { ...StyleSheet.absoluteFillObject },
  featuredOverlay: { flex: 1, padding: 20, justifyContent: 'flex-end' },
  featuredStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  serverBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  eventsSection: { marginTop: 16 },
  dateGroup: { marginBottom: 24, paddingHorizontal: 16 },
  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1 },
  dateEvents: { gap: 10 },
  eventCardContainer: {},
  eventCard: { flexDirection: 'row', borderRadius: 14, overflow: 'hidden' },
  eventImage: { width: 100, height: 100 },
  eventContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  eventTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  eventStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorCard: { marginHorizontal: 16, padding: 24, marginTop: 8 },
  errorContent: { alignItems: 'center', gap: 12 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  emptyCard: { marginHorizontal: 16, padding: 32, marginTop: 8 },
  emptyContent: { alignItems: 'center', gap: 12 },
});

import { useState } from 'react';