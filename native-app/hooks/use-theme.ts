'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);
const STORAGE_KEY = 'arex-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setThemeState(stored as Theme);
      } catch {
        // ignore
      } finally {
        setMounted(true);
      }
    };
    loadTheme();
  }, []);

  const resolvedTheme = theme === 'system' 
    ? (systemColorScheme ?? 'light') 
    : theme;

  useEffect(() => {
    if (mounted) {
      AsyncStorage.setItem(STORAGE_KEY, theme).catch(() => {});
    }
  }, [theme, mounted]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = async () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    await setTheme(nextTheme);
  };

  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'system', resolvedTheme: 'light', setTheme: async () => {}, toggleTheme: async () => {} }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}