'use client';

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

const colors = {
  light: {
    background: '#fafafa',
    card: '#ffffff',
    border: '#e4e4e7',
    text: '#0a0a0a',
    textMuted: '#71717a',
    primary: '#F7931A',
    primaryLight: 'rgba(247, 147, 26, 0.15)',
    danger: '#ef4444',
  },
  dark: {
    background: '#0a0a0a',
    card: '#141414',
    border: '#262626',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    primary: '#F7931A',
    primaryLight: 'rgba(247, 147, 26, 0.15)',
    danger: '#ef4444',
  },
};

const MENU_ITEMS = [
  { icon: 'user', label: 'Hồ sơ của tôi', href: '/profile/edit' },
  { icon: 'bell', label: 'Thông báo', href: '/profile/notifications' },
  { icon: 'star', label: 'Cửa hàng Prime', href: '/profile/prime' },
  { icon: 'trophy', label: 'Thành tựu', href: '/profile/achievements' },
  { icon: 'bookmark', label: 'Đã lưu', href: '/profile/bookmarks' },
  { icon: 'history', label: 'Lịch sử xem', href: '/profile/history' },
  { icon: 'settings', label: 'Cài đặt', href: '/profile/settings' },
  { icon: 'help-circle', label: 'Trợ giúp & Hỗ trợ', href: '/profile/help' },
  { icon: 'info', label: 'Giới thiệu', href: '/profile/about' },
];

export default function ProfileScreen() {
  const { user, signOut, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const themeColors = colors[resolvedTheme];

  const handleSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handlePress = (href: string) => {
    router.push(href);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.loadingCenter}>
          <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
          <View style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.primaryLight }]}>
                <Text style={[styles.avatarInitial, { color: themeColors.primary }]}>
                  {user?.display_name?.[0]?.toUpperCase() ?? 'A'}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Icon name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: themeColors.text }]}>{user?.display_name ?? 'Người dùng'}</Text>
            <Text style={[styles.userEmail, { color: themeColors.textMuted }]}>{user?.email ?? ''}</Text>
            <View style={styles.userBadges}>
              <View style={[styles.badge, { backgroundColor: themeColors.primaryLight }]}>
                <Text style={[styles.badgeText, { color: themeColors.primary }]}>{user?.role ?? 'Member'}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: themeColors.primaryLight }]}>
                <Text style={[styles.badgeText, { color: themeColors.primary }]}>Level 1</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>0</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Bài viết</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>0</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Người theo dõi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>0</Text>
            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>Đang theo dõi</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={[styles.menuSection, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.menuSectionTitle, { color: themeColors.text }]}>Tài khoản</Text>
          {MENU_ITEMS.slice(0, 5).map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => handlePress(item.href)}>
              <View style={[styles.menuIcon, { backgroundColor: themeColors.primaryLight }]}>
                <Icon name={item.icon} size={20} color={themeColors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: themeColors.text }]}>{item.label}</Text>
              <Icon name="chevron-right" size={18} color={themeColors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.menuSection, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.menuSectionTitle, { color: themeColors.text }]}>Cài đặt & Khác</Text>
          {MENU_ITEMS.slice(5).map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => handlePress(item.href)}>
              <View style={[styles.menuIcon, { backgroundColor: themeColors.primaryLight }]}>
                <Icon name={item.icon} size={20} color={themeColors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: themeColors.text }]}>{item.label}</Text>
              <Icon name="chevron-right" size={18} color={themeColors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]} onPress={handleSignOut}>
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Icon name="log-out" size={20} color={themeColors.danger} />
          </View>
          <Text style={[styles.menuLabel, { color: themeColors.danger }]}>Đăng xuất</Text>
        </TouchableOpacity>

        <View style={styles.version}>
          <Text style={[styles.versionText, { color: themeColors.textMuted }]}>Arex Network v1.1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  scrollContent: { paddingBottom: 40 },
  header: { padding: 24, paddingTop: 32 },
  avatarContainer: { position: 'relative', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 36, fontWeight: '900' },
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
  },
  userInfo: { alignItems: 'center' },
  userName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  userEmail: { fontSize: 14, marginBottom: 12 },
  userBadges: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  menuSection: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuSectionTitle: { padding: 16, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  menuIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  version: { padding: 24, alignItems: 'center' },
  versionText: { fontSize: 11, fontWeight: '500' },
});

function Icon({ name, size, color }: { name: string; size: number; color: string }) {
  const IconComponent = require('lucide-react-native')[name.charAt(0).toUpperCase() + name.slice(1)] || require('lucide-react-native').HelpCircle;
  return <IconComponent size={size} color={color} strokeWidth={2} />;
}