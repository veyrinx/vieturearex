'use client';

import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { AdminMetricCard, AdminDataTable, AdminChartCard, AdminStatCard } from '@/components/ui/AdminDataComponents';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://www.arexnetwork.site/api';

interface DashboardMetrics {
  users: {
    total: number;
    active_24h: number;
    active_7d: number;
    active_30d: number;
    new_today: number;
    banned: number;
  };
  content: {
    news_total: number;
    events_total: number;
    communities_total: number;
    posts_total: number;
    pending_review: number;
  };
  ff: {
    items_total: number;
    characters_total: number;
    tournaments_active: number;
    prime_subscribers: number;
  };
  system: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    api_latency: number;
    error_rate: number;
  };
  revenue: {
    today: number;
    week: number;
    month: number;
    yoy_growth: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'user' | 'content' | 'moderation' | 'system';
  action: string;
  target: string;
  admin: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'danger';
}

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${API_BASE}/admin/dashboard/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  const data = await res.json();
  return data;
}

async function fetchRecentActivity(): Promise<RecentActivity[]> {
  const res = await fetch(`${API_BASE}/admin/activity?limit=10`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? data;
}

async function fetchChartData(): Promise<{ users: number[]; revenue: number[]; labels: string[] }> {
  const res = await fetch(`${API_BASE}/admin/analytics/charts?days=7`);
  if (!res.ok) return { users: [], revenue: [], labels: [] };
  const data = await res.json();
  return data;
}

export default function DashboardScreen() {
  const { user, hasPermission } = useAdminAuth();
  const { theme } = useAdminTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchDashboardMetrics,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: activities } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: fetchRecentActivity,
  });

  const { data: chartData } = useQuery({
    queryKey: ['admin-charts'],
    queryFn: fetchChartData,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const { theme, colors, typography, spacing } = useAdminTheme();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <View style={styles.skeletonCard} />
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
            progressViewOffset={4}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <AnimatedView enterAnimation="fade" delay={50} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[typography.headlineMedium, { color: colors.onSurface }]}>Dashboard</Text>
            <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
              Chào mừng trở lại, {user?.display_name || 'Admin'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/reports')}>
              <Ionicons name="download" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/settings')}>
              <Ionicons name="settings" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </AnimatedView>

        {/* Key Metrics Row */}
        <AnimatedView enterAnimation="slideUp" delay={100} style={styles.metricsGrid}>
          {METRICS_CONFIG.map((metric, index) => (
            <AnimatedView key={metric.key} enterAnimation="slideUp" delay={150 + index * 50} style={styles.metricCard}>
              <AdminMetricCard
                title={metric.title}
                value={metric.formatter(metrics?.[metric.key])}
                change={metric.change ? metric.change(metrics) : null}
                icon={metric.icon}
                iconColor={metric.color}
                trend={metric.trend}
              />
            </AnimatedView>
          ))}
        </AnimatedView>

        {/* Charts Row */}
        <AnimatedView enterAnimation="slideUp" delay={200} style={styles.chartsRow}>
          <AnimatedView enterAnimation="slideRight" delay={250} style={styles.chartCard}>
            <AdminChartCard
              title="Người dùng hoạt động (7 ngày)"
              data={chartData?.users || [1200, 1350, 1280, 1420, 1500, 1480, 1600]}
              labels={chartData?.labels || ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']}
              color={colors.primary}
              type="area"
            />
          </AnimatedView>
          <AnimatedView enterAnimation="slideLeft" delay={300} style={styles.chartCard}>
            <AdminChartCard
              title="Doanh thu (7 ngày)"
              data={chartData?.revenue || [45, 52, 48, 61, 58, 65, 72]}
              labels={chartData?.labels || ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']}
              color={colors.accent}
              type="bar"
              formatValue={(v) => `${v}K VNĐ`}
            />
          </AnimatedView>
        </AnimatedView>

        {/* System Health & Quick Actions */}
        <AnimatedView enterAnimation="slideUp" delay={300} style={styles.sectionRow}>
          <AnimatedView enterAnimation="slideUp" delay={350} style={styles.sectionCard}>
            <AdminChartCard
              title="Tài nguyên hệ thống"
              data={[metrics?.system?.cpu_usage || 45, metrics?.system?.memory_usage || 62, metrics?.system?.disk_usage || 38]}
              labels=['CPU', 'RAM', 'Disk']
              color={colors.info}
              type="radial"
              showLegend
            />
          </AnimatedView>
          <AnimatedView enterAnimation="slideUp" delay={400} style={styles.sectionCard}>
            <View style={styles.quickActionsHeader}>
              <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Thao tác nhanh</Text>
            </View>
            <View style={styles.quickActionsGrid}>
              {QUICK_ACTIONS.map((action, index) => (
                <AnimatedView key={action.key} enterAnimation="scale" delay={450 + index * 40} style={styles.quickActionCard}>
                  <TouchableOpacity
                    style={[styles.quickActionBtn, { backgroundColor: action.color + '15', borderColor: action.color }]}
                    onPress={action.onPress}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={action.icon} size={24} color={action.color} />
                    <Text style={[typography.labelMedium, { color: action.color, marginTop: 8, fontWeight: '600' }]}>{action.label}</Text>
                  </TouchableOpacity>
                </AnimatedView>
              ))}
            </View>
          </AnimatedView>
        </AnimatedView>

        {/* Recent Activity */}
        <AnimatedView enterAnimation="slideUp" delay={500} style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Hoạt động gần đây</Text>
            <TouchableOpacity onPress={() => router.push('/logs')}>
              <Text style={[typography.labelSmall, { color: colors.primary }]}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          
          {error ? (
            <View style={styles.errorCard}>
              <Text style={[typography.bodyMedium, { color: colors.danger, textAlign: 'center' }]}>Không thể tải hoạt động</Text>
            </View>
          ) : (
            <AdminDataTable
              columns={ACTIVITY_COLUMNS}
              data={activities?.map((a, i) => ({
                id: a.id,
                time: formatTimeAgo(a.timestamp),
                type: { label: a.action, color: getSeverityColor(a.severity) },
                target: a.target,
                admin: a.admin,
                severity: a.severity,
              })) || []
              rowHeight={44}
              compact
            />
          )}
        </AnimatedView>

        {/* Admin Users Table */}
        {hasPermission('admin.users.view') && (
          <AnimatedView enterAnimation="slideUp" delay={600} style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.titleSmall, { color: colors.onSurface }]}>Quản trị viên hoạt động</Text>
              <TouchableOpacity onPress={() => router.push('/admins')}>
                <Text style={[typography.labelSmall, { color: colors.primary }]}>Quản lý</Text>
              </TouchableOpacity>
            </View>
            <AdminDataTable
              columns={ADMIN_COLUMNS}
              data={[
                { id: '1', name: 'Nguyễn Văn A', email: 'admin1@arex.vn', role: 'super_admin', lastActive: '2 phút trước', status: 'online' },
                { id: '2', name: 'Trần Thị B', email: 'admin2@arex.vn', role: 'admin', lastActive: '15 phút trước', status: 'online' },
                { id: '3', name: 'Lê Văn C', email: 'manager1@arex.vn', role: 'manager', lastActive: '1 giờ trước', status: 'away' },
                { id: '4', name: 'Phạm Thị D', email: 'support1@arex.vn', role: 'support', lastActive: '3 giờ trước', status: 'offline' },
              ]}
              rowHeight={48}
            />
          </AnimatedView>
        )}

        {/* Bottom Stats */}
        <AnimatedView enterAnimation="fade" delay={700} style={styles.bottomStats}>
          <AdminStatCard
            label="Uptime"
            value="99.97%"
            icon="checkmark-circle"
            color={colors.success}
          />
          <AdminStatCard
            label="API Latency (p95)"
            value={`${metrics?.system?.api_latency || 142}ms`}
            icon="speed"
            color={colors.info}
          />
          <AdminStatCard
            label="Error Rate"
            value={`${(metrics?.system?.error_rate || 0.12).toFixed(2)}%`}
            icon="alert-circle"
            color={colors.warning}
          />
          <AdminStatCard
            label="Active Sessions"
            value={`${metrics?.users?.active_24h || 12450}`}
            icon="people"
            color={colors.primary}
          />
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const METRICS_CONFIG = [
  { key: 'users', title: 'Người dùng', icon: 'people', color: '#00D4AA', formatter: (m) => m?.total?.toLocaleString() || '0', trend: 'up', change: (m) => `+${m?.new_today || 0} hôm nay` },
  { key: 'content', title: 'Nội dung', icon: 'article', color: '#6366F1', formatter: (m) => (m?.news_total || 0) + (m?.events_total || 0), trend: 'up', change: (m) => `${m?.pending_review || 0} chờ duyệt` },
  { key: 'ff', title: 'Free Fire', icon: 'sports-esports', color: '#F59E0B', formatter: (m) => (m?.items_total || 0) + (m?.characters_total || 0), trend: 'up', change: (m) => `${m?.tournaments_active || 0} giải đấu` },
  { key: 'revenue', title: 'Doanh thu', icon: 'cash', color: '#10B981', formatter: (m) => (m?.today || 0).toLocaleString() + 'K', trend: 'up', change: (m) => `+${m?.yoy_growth || 12}% so với T7` },
];

const QUICK_ACTIONS = [
  { key: 'users', label: 'Quản lý user', icon: 'person-add', color: '#3B82F6', onPress: () => {} },
  { key: 'content', label: 'Duyệt nội dung', icon: 'checkmark-circle', color: '#10B981', onPress: () => {} },
  { key: 'ban', label: 'Cấm người dùng', icon: 'ban', color: '#EF4444', onPress: () => {} },
  { key: 'broadcast', label: 'Gửi thông báo', icon: 'megaphone', color: '#8B5CF6', onPress: () => {} },
  { key: 'backup', label: 'Sao lưu ngay', icon: 'cloud-upload', color: '#F59E0B', onPress: () => {} },
  { key: 'deploy', label: 'Triển khai', icon: 'rocket', color: '#6366F1', onPress: () => {} },
];

const ACTIVITY_COLUMNS = [
  { key: 'time', header: 'Thời gian', width: 80 },
  { key: 'type', header: 'Hành động', width: 120, render: (v: any) => ({ label: v.label, color: v.color }) },
  { key: 'target', header: 'Đối tượng', width: 'auto' },
  { key: 'admin', header: 'Người thực hiện', width: 100 },
  { key: 'severity', header: 'Mức độ', width: 80, render: (v: string) => ({ label: v, color: getSeverityColor(v) }) },
];

const ADMIN_COLUMNS = [
  { key: 'name', header: 'Tên', width: 'auto' },
  { key: 'email', header: 'Email', width: 'auto' },
  { key: 'role', header: 'Vai trò', width: 100, render: (v: string) => ({ label: v, color: getRoleColor(v) }) },
  { key: 'lastActive', header: 'Hoạt động cuối', width: 120 },
  { key: 'status', header: 'Trạng thái', width: 80, render: (v: string) => ({ label: v, color: v === 'online' ? '#10B981' : v === 'away' ? '#F59E0B' : '#64748B' }) },
];

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'danger': return '#EF4444';
    case 'warning': return '#F59E0B';
    default: return '#00D4AA';
  }
}

function getRoleColor(role: string) {
  switch (role) {
    case 'super_admin': return '#EF4444';
    case 'admin': return '#3B82F6';
    case 'manager': return '#10B981';
    case 'support': return '#F59E0B';
    default: return '#64748B';
  }
}

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes}ph`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}ngày`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  skeletonCard: { marginHorizontal: 16, marginBottom: 12, height: 120, borderRadius: 10, backgroundColor: '#1E293B' },
  scrollContent: { paddingBottom: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: {},
  headerRight: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginTop: 8 },
  metricCard: { flex: 1, minWidth: '48%', maxWidth: '50%' },
  chartsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginTop: 16 },
  chartCard: { flex: 1, minWidth: 0 },
  sectionRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginTop: 16 },
  sectionCard: { flex: 1, minWidth: 0, padding: 16, borderRadius: 10, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B' },
  quickActionsHeader: { marginBottom: 12 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickActionCard: { width: '30%' },
  quickActionBtn: { padding: 16, borderRadius: 10, borderWidth: 1, alignItems: 'center', minWidth: 90 },
  activitySection: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  activitySection: { paddingHorizontal: 16, marginTop: 16 },
  errorCard: { padding: 24, alignItems: 'center' },
  bottomStats: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginTop: 16, gap: 12 },
});

import { useState } from 'react';