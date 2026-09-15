'use client';

import { View, Text, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { ReactNode, useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { AdminDrawer } from './AdminDrawer';
import { AdminTopBar } from './AdminTopBar';
import { useAdminTheme } from '@/hooks/use-admin-theme';

interface AdminStackProps {
  children: ReactNode;
}

export function AdminStack({ children }: AdminStackProps) {
  const { theme } = useAdminTheme();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Simple mobile detection - in reality you'd use useWindowDimensions
    setIsMobile(Platform.OS !== 'web');
  }, []);

  if (isMobile) {
    return (
      <SafeAreaView style={[styles.mobileContainer, { backgroundColor: theme.colors.background }]}>
        <AdminTopBar 
          onMenuPress={() => setSidebarOpen(true)}
          title="Dashboard"
        />
        <View style={styles.mobileContent}>
          {children}
        </View>
        <AdminDrawer 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
        />
      </SafeAreaView>
    );
  }

  // Desktop/Tablet layout with persistent sidebar
  return (
    <SafeAreaView style={[styles.desktopContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.desktopLayout}>
        <AdminDrawer 
          open={true} 
          onClose={() => {}}
          persistent
        />
        <View style={styles.desktopContent}>
          <AdminTopBar title="Dashboard" />
          <View style={styles.contentArea}>
            {children}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mobileContainer: { flex: 1 },
  mobileContent: { flex: 1, paddingTop: 4 },
  desktopContainer: { flex: 1 },
  desktopLayout: { flex: 1, flexDirection: 'row' },
  desktopContent: { flex: 1, flexDirection: 'column' },
  contentArea: { flex: 1, overflow: 'auto' },
});