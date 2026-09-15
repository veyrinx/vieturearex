'use client';

import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { Platform } from 'react-native';

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
  const res = await fetch(`${API_BASE}/events?limit=20`);
  if (!res.ok) throw new Error('Failed to fetch events');
  const data = await res.json();
  return data.data ?? data;
}

export default function EventsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [refreshing, setRefreshing] = useState(false);

  const { data: events, isLoading, error, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
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
    live: '#ef4444',
    upcoming: '#3b82f6',
    ended: '#9ca3af',
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingCenter}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Đang tải sự kiện...</Text>
        </View>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return colors.live;
      case 'upcoming': return colors.upcoming;
      default: return colors.ended;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'live': return 'ĐANG DIỄN RA';
      case 'upcoming': return 'SẮP DIỄN RA';
      default: return 'ĐÃ KẾT THÚC';
    }
  };

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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sự kiện Free Fire</Text>
        </View>

        {error ? (
          <View style={styles.error}>
            <Text style={[styles.errorText, { color: colors.textMuted }]}>Không thể tải sự kiện</Text>
            <TouchableOpacity onPress={onRefresh} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {events?.map((event) => (
              <TouchableOpacity key={event.id} style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {event.thumbnail_url && (
                  <Image source={{ uri: event.thumbnail_url }} style={styles.eventImage} resizeMode="cover" />
                )}
                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
                      <Text style={styles.statusText}>{getStatusLabel(event.status)}</Text>
                    </View>
                    <Text style={[styles.eventServer, { color: colors.textMuted }]}>{event.server}</Text>
                  </View>
                  <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                  <Text style={[styles.eventDate, { color: colors.textMuted }]}>{formatDateRange(event.start_at, event.end_at)}</Text>
                  <View style={styles.eventMeta}>
                    <Text style={[styles.eventViews, { color: colors.textMuted }]}>{formatNumber(event.view_count)} xem</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  scrollContent: { paddingBottom: 100, paddingHorizontal: 16 },
  section: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  error: { alignItems: 'center', padding: 32 },
  errorText: { fontSize: 14, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  eventsList: { gap: 12 },
  eventCard: {
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
  eventImage: { width: 120, height: 100, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  eventContent: { flex: 1, padding: 12, justifyContent: 'space-between' },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  eventServer: { fontSize: 11, fontWeight: '500' },
  eventTitle: { fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 4 },
  eventDate: { fontSize: 12, marginBottom: 8 },
  eventMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  eventViews: { fontSize: 11, fontWeight: '500' },
  loadingMore: { padding: 16, alignItems: 'center' },
});