'use client';

import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, ScrollView } from 'react-native';
import { ReactNode, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const DRAWER_WIDTH = 280;
const COLLAPSED_WIDTH = 72;

const NAV_SECTIONS = [
  {
    title: 'Tổng quan',
    icon: 'home',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
      { id: 'analytics', label: 'Phân tích', icon: 'analytics', href: '/analytics' },
      { id: 'realtime', label: 'Thời gian thực', icon: 'pulse', href: '/realtime' },
    ],
  },
  {
    title: 'Quản lý nội dung',
    icon: 'article',
    items: [
      { id: 'news', label: 'Tin tức', icon: 'newspaper', href: '/news' },
      { id: 'events', label: 'Sự kiện', icon: 'event', href: '/events' },
      { id: 'community', label: 'Cộng đồng', icon: 'groups', href: '/community' },
      { id: 'wiki', label: 'Wiki', icon: 'menu_book', href: '/wiki' },
    ],
  },
  {
    title: 'Quản lý người dùng',
    icon: 'people',
    items: [
      { id: 'users', label: 'Người dùng', icon: 'person', href: '/users' },
      { id: 'profiles', label: 'Hồ sơ', icon: 'badge', href: '/profiles' },
      { id: 'bans', label: 'Cấm/Bỏ cấm', icon: 'block', href: '/moderation/bans' },
      { id: 'reports', label: 'Báo cáo', icon: 'report', href: '/moderation/reports' },
    ],
  },
  {
    title: 'Free Fire',
    icon: 'sports_esports',
    items: [
      { id: 'items', label: 'Vũ khí/Skin', icon: 'inventory', href: '/ff/items' },
      { id: 'characters', label: 'Nhân vật', icon: 'person', href: '/ff/characters' },
      { id: 'tournaments', label: 'Giải đấu', icon: 'emoji_events', href: '/tournaments' },
      { id: 'prime', label: 'Cửa hàng Prime', icon: 'store', href: '/prime' },
    ],
  },
  {
    title: 'Hệ thống',
    icon: 'settings',
    items: [
      { id: 'settings', label: 'Cài đặt chung', icon: 'settings', href: '/settings' },
      { id: 'admins', label: 'Quản trị viên', icon: 'admin_panel_settings', href: '/admins' },
      { id: 'logs', label: 'Nhật ký hệ thống', icon: 'history', href: '/logs' },
      { id: 'backup', label: 'Sao lưu/Phục hồi', icon: 'backup', href: '/backup' },
    ],
  },
] as const;

interface AdminDrawerProps {
  open: boolean;
  onClose: () => void;
  persistent?: boolean;
  pathname?: string;
}

export function AdminDrawer({ open, onClose, persistent = false, pathname }: AdminDrawerProps) {
  const { user, signOut } = useAdminAuth();
  const { theme } = useAdminTheme();
  const [collapsed, setCollapsed] = useState(false);

  const translateX = useRef(new Animated.Value(open ? 0 : -DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: open ? 0 : -DRAWER_WIDTH,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  if (persistent && !open) return null;

  const animatedStyle = {
    transform: [{ translateX }],
  };

  const { colors, typography, spacing } = theme;

  return (
    <Animated.View style={[styles.drawer, animatedStyle, { width: DRAWER_WIDTH, backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.drawerHeader}>
        {!collapsed && (
          <View style={styles.logoSection}>
            <View style={styles.logoBox}>
              <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
            </View>
            <View style={styles.logoText}>
              <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: '700' }]}>Arex Hub</Text>
              <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant }]}>Admin Panel</Text>
            </View>
          </View>
        )}
        {collapsed && (
          <View style={styles.collapsedLogo}>
            <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
          </View>
        )}
        <TouchableOpacity style={styles.collapseBtn} onPress={() => setCollapsed(!collapsed)}>
          <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* User Info */}
      {!collapsed && user && (
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[typography.titleMedium, { color: colors.primary, fontWeight: '700' }]}>{user.display_name?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={[typography.labelMedium, { color: colors.onSurface }]}>{user.display_name}</Text>
            <View style={styles.userRole}>
              <Text style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>{getRoleLabel(user.role)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Navigation */}
      <ScrollView style={styles.navScroll} contentContainerStyle={styles.navContent} showsVerticalScrollIndicator={false}>
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <View key={section.title} style={styles.navSection}>
            {!collapsed && (
              <View style={styles.sectionHeader}>
                <Ionicons name={section.icon} size={16} color={colors.onSurfaceVariant} />
                <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, marginLeft: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 }]}>{section.title}</Text>
              </View>
            )}
            <View style={styles.sectionItems}>
              {section.items.map((item, itemIndex) => {
                const active = isActive(item.href);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.navItem,
                      active && styles.navItemActive,
                      { backgroundColor: active ? colors.primaryContainer : 'transparent' }
                    ]}
                    onPress={() => {
                      if (!persistent) onClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={item.icon} size={20} color={active ? colors.primary : colors.onSurfaceVariant} />
                    {!collapsed && (
                      <Text style={[
                        typography.labelMedium,
                        { color: active ? colors.primary : colors.onSurface, fontWeight: active ? '600' : '400' }
                      ]}>{item.label}</Text>
                    )}
                    {collapsed && (
                      <View style={styles.tooltip}>
                        <Text style={[typography.labelSmall, { color: colors.onSurface }]}>{item.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        {!collapsed && (
          <TouchableOpacity 
            style={[styles.signOutItem, { borderColor: colors.outline }]}
            onPress={() => { signOut(); if (!persistent) onClose(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="logout" size={20} color={colors.danger} />
            <Text style={[typography.labelMedium, { color: colors.danger, marginLeft: spacing.sm }]}>Đăng xuất</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Version */}
      {!collapsed && (
        <View style={styles.version}>
          <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant }]}>Arex Hub v1.1.3</Text>
        </View>
      )}
    </Animated.View>
  );
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

function getRoleLabel(role: string) {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'manager': return 'Manager';
    case 'support': return 'Support';
    default: return role;
  }
}

const styles = StyleSheet.create({
  drawer: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    bottom: 0, 
    zIndex: 100,
    borderRightWidth: 1,
  },
  drawerHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  logoSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#004D3A', justifyContent: 'center', alignItems: 'center' },
  logoText: { flex: 1 },
  collapsedLogo: { padding: 8 },
  collapseBtn: { padding: 8 },
  userSection: { padding: 16, borderBottomWidth: 1, gap: 12 },
  userAvatar: { width: 44, height: 44, borderRadius: 22 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1, marginLeft: 12 },
  userRole: { marginTop: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 10, fontWeight: '700' },
  navScroll: { flex: 1 },
  navContent: { paddingBottom: 24 },
  navSection: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, marginBottom: 4 },
  sectionItems: { paddingHorizontal: 8 },
  navItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    borderRadius: 8, 
    marginHorizontal: 4,
    marginBottom: 2,
  },
  navItemActive: { },
  tooltip: { position: 'absolute', left: 80, backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, zIndex: 1000 },
  signOutItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  version: { padding: 16, alignItems: 'center', borderTopWidth: 1 },
});

import { useRef, useEffect } from 'react';