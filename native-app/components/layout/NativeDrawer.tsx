'use client';

import { Drawer } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { Platform } from 'react-native';

const DRAWER_WIDTH = 280;

const SECTIONS = [
  {
    label: 'Chính',
    items: [
      { name: 'home', label: 'Trang Chủ', href: '/(tabs)/home' },
      { name: 'newspaper', label: 'Tin Tức', href: '/(tabs)/news' },
      { name: 'calendar', label: 'Sự Kiện', href: '/(tabs)/events' },
    ],
  },
  {
    label: 'Khám Phá',
    items: [
      { name: 'users', label: 'Cộng Đồng', href: '/(tabs)/community' },
      { name: 'trophy', label: 'Giải Đấu', href: '/(tabs)/tournaments' },
      { name: 'flame', label: 'Trực Tiếp', href: '/(tabs)/live' },
      { name: 'star', label: 'Cửa Hàng Prime', href: '/(tabs)/prime' },
    ],
  },
  {
    label: 'Công Cụ',
    items: [
      { name: 'settings', label: 'Công Cụ FF', href: '/(tabs)/tools' },
      { name: 'heart', label: 'Quiz FF', href: '/(tabs)/quiz' },
      { name: 'shield', label: 'Wiki CĐ', href: '/(tabs)/wiki' },
      { name: 'sword', label: 'Thư Viện Icon', href: '/(tabs)/items' },
    ],
  },
  {
    label: 'Tài Khoản',
    items: [
      { name: 'user', label: 'Hồ Sơ', href: '/(tabs)/profile' },
      { name: 'settings', label: 'Cài Đặt', href: '/(tabs)/settings' },
    ],
  },
];

export function NativeDrawer() {
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const isDark = theme === 'dark';

  const colors = {
    background: isDark ? '#0a0a0a' : '#ffffff',
    card: isDark ? '#141414' : '#f8fafc',
    border: isDark ? '#262626' : '#e4e4e7',
    text: isDark ? '#fafafa' : '#0a0a0a',
    textMuted: isDark ? '#a1a1aa' : '#71717a',
    primary: '#F7931A',
    primaryLight: 'rgba(247, 147, 26, 0.15)',
  };

  return (
    <Drawer
      content={(props) => (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} {...props}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.logoContainer}>
              <Text style={[styles.logoText, { color: colors.primary }]}>Arex</Text>
              <Text style={[styles.logoSub, { color: colors.textMuted }]}>Network</Text>
            </View>
          </View>

          {/* User Info */}
          {user && (
            <View style={[styles.userInfo, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={styles.avatarContainer}>
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                      {user.display_name?.[0]?.toUpperCase() ?? 'A'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: colors.text }]}>{user.display_name ?? 'User'}</Text>
                <Text style={[styles.userRole, { color: colors.textMuted }]}>{user.role}</Text>
              </View>
            </View>
          )}

          {/* Navigation Sections */}
          <View style={styles.sections}>
            {SECTIONS.map((section, si) => (
              <View key={section.label} style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{section.label}</Text>
                {section.items.map((item, i) => (
                  <TouchableOpacity
                    key={item.name}
                    style={[styles.item, { backgroundColor: colors.background }]}
                    onPress={() => {
                      // Navigation handled by Drawer
                    }}
                  >
                    <View style={styles.iconContainer}>
                      <Icon name={item.name} size={20} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.footerItem, { backgroundColor: colors.card }]} onPress={() => {}}>
              <Icon name="share" size={20} color={colors.textMuted} />
              <Text style={[styles.footerLabel, { color: colors.text }]}>Chia sẻ ứng dụng</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerItem, { backgroundColor: colors.card }]} onPress={() => {}}>
              <Icon name="star" size={20} color={colors.textMuted} />
              <Text style={[styles.footerLabel, { color: colors.text }]}>Đánh giá ứng dụng</Text>
            </TouchableOpacity>
            {user && (
              <TouchableOpacity
                style={[styles.footerItem, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }]}
                onPress={() => signOut()}
              >
                <Icon name="log-out" size={20} color="#ef4444" />
                <Text style={[styles.footerLabel, { color: '#ef4444' }]}>Đăng xuất</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.version}>
            <Text style={[styles.versionText, { color: colors.textMuted }]}>v1.1.0 • Arex Network</Text>
          </View>
        </SafeAreaView>
      )}
    >
      <Drawer.Screen name="(tabs)" />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  logoSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
    letterSpacing: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  sections: {
    flex: 1,
    paddingHorizontal: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: 12,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: 4,
    marginBottom: 4,
    borderWidth: 1,
  },
  footerLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  version: {
    paddingVertical: 16,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

function Icon({ name, size, color }: { name: string; size: number; color: string }) {
  const IconComponent = require('lucide-react-native')[name.charAt(0).toUpperCase() + name.slice(1)] || require('lucide-react-native').HelpCircle;
  return <IconComponent size={size} color={color} strokeWidth={2} />;
}