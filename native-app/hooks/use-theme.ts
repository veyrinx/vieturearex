'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTheme, Theme } from '@/constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);
const STORAGE_KEY = 'arex-theme-mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
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
    ? (systemColorScheme ?? 'light') 
    : themeMode;

  const theme = createTheme(resolvedTheme);

  useEffect(() => {
    if (mounted) {
      AsyncStorage.setItem(STORAGE_KEY, themeMode).catch(() => {});
    }
  }, [themeMode, mounted]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = async () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    await setThemeMode(nextMode);
  };

  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ 
        themeMode: 'system', 
        resolvedTheme: 'light', 
        theme: createTheme('light'),
        setThemeMode: async () => {}, 
        toggleTheme: async () => {} 
      }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, theme, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}