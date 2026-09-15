'use client';

import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { Ionicons } from '@expo/vector-icons';

interface AdminTopBarProps {
  onMenuPress?: () => void;
  title?: string;
  actions?: React.ReactNode;
}

export function AdminTopBar({ onMenuPress, title, actions }: AdminTopBarProps) {
  const { user } = useAdminAuth();
  const { theme } = useAdminTheme();
  const { colors, typography, spacing } = theme;

  return (
    <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline }]}>
      <View style={styles.leftSection}>
        {onMenuPress && (
          <TouchableOpacity style={styles.iconBtn} onPress={onMenuPress} activeOpacity={0.8}>
            <Ionicons name="menu" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        )}
        {title && (
          <Text style={[typography.titleMedium, { color: colors.onSurface, marginLeft: 8 }]}>{title}</Text>
        )}
      </View>

      <View style={styles.rightSection}>
        {actions}
        
        {/* Notifications */}
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
          <Ionicons name="notifications" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* Theme Toggle */}
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
          <Ionicons name="contrast" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* User Menu */}
        <View style={styles.userMenu}>
          <View style={styles.userAvatar}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#00D4AA' }}>A</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { 
    height: 56, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16,
    position: 'relative',
    zIndex: 50,
  },
  leftSection: { flexDirection: 'row', alignItems: 'center' },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  userMenu: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#004D3A', justifyContent: 'center', alignItems: 'center' },
});