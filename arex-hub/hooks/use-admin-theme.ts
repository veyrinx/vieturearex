'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAdminTheme, AdminTheme } from '@/constants/theme';

type ThemeMode = 'dark' | 'light' | 'system';

interface AdminThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  theme: AdminTheme;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const AdminThemeContext = createContext<AdminThemeContextType | null>(null);
const STORAGE_KEY = 'arex-hub-theme-mode';

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark'); // Default dark for admin
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setThemeModeState(stored as ThemeMode);
      } catch {
        // ignore
      } finally {
        setMounted(true);
      }
    };
    loadTheme();
  }, []);

  const resolvedTheme = themeMode === 'system' 
    ? (systemColorScheme ?? 'dark') 
    : themeMode;

  const theme = createAdminTheme(resolvedTheme);

  useEffect(() => {
    if (mounted) {
      AsyncStorage.setItem(STORAGE_KEY, themeMode).catch(() => {});
    }
  }, [themeMode, mounted]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = async () => {
    const modes: ThemeMode[] = ['dark', 'light', 'system'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    await setThemeMode(nextMode);
  };

  if (!mounted) {
    return (
      <AdminThemeContext.Provider value={{ 
        themeMode: 'dark', 
        resolvedTheme: 'dark', 
        theme: createAdminTheme('dark'),
        setThemeMode: async () => {}, 
        toggleTheme: async () => {} 
      }}>
        {children}
      </AdminThemeContext.Provider>
    );
  }

  return (
    <AdminThemeContext.Provider value={{ themeMode, resolvedTheme, theme, setThemeMode, toggleTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) throw new Error('useAdminTheme must be used within AdminThemeProvider');
  return context;
}