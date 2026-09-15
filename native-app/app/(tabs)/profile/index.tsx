'use client';

import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { GlassCard, HeroCard, ContentCard, CompactCard } from '@/components/ui/GlassCard';

const MENU_SECTIONS = [
  {
    title: 'Tài khoản',
    icon: 'person',
    items: [
      { id: 'edit', label: 'Chỉnh sửa hồ sơ', icon: 'edit', href: '/profile/edit', color: '#3B82F6' },
      { id: 'avatar', label: 'Đổi avatar', icon: 'image', href: '/profile/avatar', color: '#8B5CF6' },
      { id: 'security', label: 'Bảo mật & Đăng nhập', icon: 'shield', href: '/profile/security', color: '#10B981' },
      { id: 'notifications', label: 'Cài đặt thông báo', icon: 'notifications', href: '/profile/notifications', color: '#F59E0B' },
    ],
  },
  {
    title: 'Arex Prime',
    icon: 'star',
    items: [
      { id: 'prime', label: 'Gói thành viên Prime', icon: 'diamond', href: '/prime-store', color: '#F7931A', premium: true },
      { id: 'rewards', label: 'Phần thưởng hàng ngày', icon: 'gift', href: '/profile/daily-rewards', color: '#EC4899' },
      { id: 'referral', label: 'Mời bạn bè', icon: 'share', href: '/profile/referral', color: '#06B6D4' },
    ],
  },
  {
    title: 'Hoạt động',
    icon: 'activity',
    items: [
      { id: 'posts', label: 'Bài viết của tôi', icon: 'document', href: '/profile/posts', color: '#3B82F6' },
      { id: 'comments', label: 'Bình luận', icon: 'chatbubbles', href: '/profile/comments', color: '#8B5CF6' },
      { id: 'bookmarks', label: 'Đã lưu', icon: 'bookmark', href: '/profile/bookmarks', color: '#10B981' },
      { id: 'history', label: 'Lịch sử xem', icon: 'history', href: '/profile/history', color: '#F59E0B' },
    ],
  },
  {
    title: 'Thành tựu',
    icon: 'trophy',
    items: [
      { id: 'achievements', label: 'Huy hiệu & Danh hiệu', icon: 'medal', href: '/profile/achievements', color: '#F7931A' },
      { id: 'leaderboard', label: 'Bảng xếp hạng', icon: 'trophy', href: '/leaderboard', color: '#EC4899' },
    ],
  },
  {
    title: 'Cài đặt',
    icon: 'settings',
    items: [
      { id: 'settings', label: 'Cài đặt ứng dụng', icon: 'settings', href: '/profile/settings', color: '#6B7280' },
      { id: 'theme', label: 'Giao diện', icon: 'contrast', href: '/profile/theme', color: '#6B7280' },
      { id: 'language', label: 'Ngôn ngữ', icon: 'language', href: '/profile/language', color: '#6B7280' },
      { id: 'data', label: 'Dữ liệu & Lưu trữ', icon: 'database', href: '/profile/data', color: '#6B7280' },
    ],
  },
  {
    title: 'Hỗ trợ',
    icon: 'help',
    items: [
      { id: 'help', label: 'Trung tâm trợ giúp', icon: 'help-circle', href: '/profile/help', color: '#6B7280' },
      { id: 'feedback', label: 'Gửi phản hồi', icon: 'send', href: '/profile/feedback', color: '#6B7280' },
      { id: 'about', label: 'Giới thiệu Arex', icon: 'information-circle', href: '/profile/about', color: '#6B7280' },
      { id: 'legal', label: 'Điều khoản & Quyền riêng tư', icon: 'document', href: '/profile/legal', color: '#6B7280' },
    ],
  },
];

export default function ProfileScreen() {
  const { user, signOut, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const { colors, typography, spacing } = theme;

  const handleSignOut = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  const handlePress = (href: string) => {
    router.push(href);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[typography.bodyLarge, { color: colors.onSurfaceVariant }]}>Đang tải hồ sơ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = user?.display_name || 'Người dùng';
  const initial = displayName.charAt(0).toUpperCase();
  const memberSince = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    : 'Tháng này';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Profile Header */}
        <AnimatedView enterAnimation="fade" delay={100} style={styles.headerSection}>
          <HeroCard style={styles.profileHeaderCard}>
            <View style={styles.profileHeaderContent}>
              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={[typography.displaySmall, { color: colors.primary, fontWeight: '700' }]}>{initial}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.editAvatarBtn} onPress={() => router.push('/profile/avatar')}>
                  <Ionicons name="camera" size={20} color="#fff" />
                </TouchableOpacity>
                {user?.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  </View>
                )}
              </View>

              {/* User Info */}
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={[typography.headlineMedium, { color: colors.onSurface }]}>{displayName}</Text>
                  {user?.is_verified && (
                    <View style={styles.verifiedInline}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    </View>
                  )}
                </View>
                <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>@{user?.username || 'user'}</Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 2 }]}>Thành viên từ {memberSince}</Text>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <TouchableOpacity style={styles.statItem} onPress={() => router.push('/profile/posts')}>
                    <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: '700' }]}>0</Text>
                    <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant }]}>Bài viết</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statItem} onPress={() => router.push('/profile/followers')}>
                    <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: '700' }]}>0</Text>
                    <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant }]}>Người theo dõi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statItem} onPress={() => router.push('/profile/following')}>
                    <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: '700' }]}>0</Text>
                    <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant }]}>Đang theo dõi</Text>
                  </TouchableOpacity>
                </View>

                {/* Role Badge */}
                <View style={[styles.roleBadge, { backgroundColor: colors.primaryContainer }]}>
                  <Text style={[typography.labelMedium, { color: colors.primary, fontWeight: '700' }]}>{user?.role || 'Member'}</Text>
                </View>
              </View>

              {/* Prime Status */}
              {user?.is_prime && (
                <View style={styles.primeBanner}>
                  <View style={styles.primeIcon}>
                    <Ionicons name="diamond" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.primeInfo}>
                    <Text style={[typography.labelMedium, { color: colors.primary, fontWeight: '700' }]}>Arex Prime Active</Text>
                    <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>Hết hạn: 15/12/2024</Text>
                  </View>
                  <TouchableOpacity style={styles.primeAction} onPress={() => router.push('/prime-store')}>
                    <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '700' }]}>Gia hạn</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </HeroCard>
        </AnimatedView>

        {/* Quick Actions */}
        <AnimatedView enterAnimation="slideUp" delay={200} style={styles.quickActionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.titleLarge, { color: colors.onSurface }]}>Truy cập nhanh</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action, index) => (
              <AnimatedView 
                key={action.id} 
                enterAnimation="scale" 
                delay={300 + index * 40}
                style={styles.quickActionCard}
              >
                <TouchableOpacity
                  style={styles.quickActionInner}
                  onPress={action.onPress}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                    <Ionicons name={action.icon} size={24} color={action.color} />
                  </View>
                  <Text style={[typography.labelMedium, { color: colors.onSurface, marginTop: spacing.sm, fontWeight: '500' }]}>{action.label}</Text>
                </TouchableOpacity>
              </AnimatedView>
            ))}
          </View>
        </AnimatedView>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section, sectionIndex) => (
          <AnimatedView 
            key={section.title} 
            enterAnimation="slideUp" 
            delay={400 + sectionIndex * 80}
            style={styles.menuSection}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name={section.icon} size={22} color={colors.primary} />
                <Text style={[typography.titleLarge, { color: colors.onSurface, marginLeft: spacing.sm }]}>{section.title}</Text>
              </View>
            </View>
            <View style={styles.menuItems}>
              {section.items.map((item, itemIndex) => (
                <AnimatedView 
                  key={item.id} 
                  enterAnimation="slideRight" 
                  delay={450 + sectionIndex * 80 + itemIndex * 30}
                  style={styles.menuItemContainer}
                >
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => item.href ? handlePress(item.href) : item.onPress?.()}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name={item.icon} size={22} color={item.color} />
                    </View>
                    <View style={styles.menuContent}>
                      <Text style={[typography.titleSmall, { color: colors.onSurface }]}>{item.label}</Text>
                      {item.premium && (
                        <View style={styles.premiumTag}>
                          <Ionicons name="star" size={10} color={colors.primary} />
                          <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: '600', marginLeft: 2 }]}>Prime</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.outlineVariant} />
                  </TouchableOpacity>
                  {itemIndex < section.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
                  )}
                </AnimatedView>
              ))}
            </View>
          </AnimatedView>
        ))}

        {/* Sign Out */}
        <AnimatedView enterAnimation="slideUp" delay={500 + MENU_SECTIONS.length * 80} style={styles.signOutSection}>
          <TouchableOpacity 
            style={[styles.signOutCard, { borderColor: colors.outlineVariant }]}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="log-out" size={22} color="#EF4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[typography.titleSmall, { color: "#EF4444" }]}>Đăng xuất</Text>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>Thoát khỏi tài khoản hiện tại</Text>
            </View>
          </TouchableOpacity>
        </AnimatedView>

        {/* App Info */}
        <AnimatedView enterAnimation="fade" delay={600 + MENU_SECTIONS.length * 80} style={styles.appInfoSection}>
          <View style={styles.appInfo}>
            <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>Arex Network v1.1.3</Text>
            <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 2 }]}>React Native + Expo • Built with ❤️</Text>
          </View>
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const QUICK_ACTIONS = [
  { id: 'prime', label: 'Cửa hàng Prime', icon: 'diamond', color: '#F7931A', onPress: () => {} },
  { id: 'rewards', label: 'Điểm danh', icon: 'calendar', color: '#10B981', onPress: () => {} },
  { id: 'referral', label: 'Mời bạn bè', icon: 'share', color: '#06B6D4', onPress: () => {} },
  { id: 'settings', label: 'Cài đặt', icon: 'settings', color: '#6B7280', onPress: () => {} },
];

function handlePress(href: string) {
  // Navigation handled by router
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollContent: { paddingBottom: 40 },
  headerSection: { paddingHorizontal: 16, paddingBottom: 8 },
  profileHeaderCard: { marginHorizontal: 16, overflow: 'hidden' },
  profileHeaderContent: { flexDirection: 'row', padding: 20, gap: 16 },
  avatarWrapper: { position: 'relative', flexShrink: 0 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#F7931A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  verifiedInline: { marginLeft: 6 },
  userInfo: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1 },
  statItem: { alignItems: 'center' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: spacing.sm },
  primeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, padding: spacing.md, borderRadius: 12, backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFE082' },
  primeIcon: { marginRight: spacing.sm },
  primeInfo: { flex: 1 },
  primeAction: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#F7931A' },
  quickActionsSection: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { marginBottom: 12 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  quickActionCard: { width: '48%', aspectRatio: 1 },
  quickActionInner: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  quickActionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  menuSection: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  menuItems: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.outlineVariant },
  menuItemContainer: { borderBottomWidth: 1, borderColor: colors.outlineVariant },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuContent: { flex: 1 },
  premiumTag: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  divider: { height: 1, marginLeft: 70 },
  signOutSection: { paddingHorizontal: 16, marginTop: 16 },
  signOutCard: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderRadius: 14, borderWidth: 1 },
  appInfoSection: { paddingHorizontal: 16, marginTop: 24, marginBottom: 40 },
  appInfo: { alignItems: 'center', gap: 2 },
});

import { useState } from 'react';