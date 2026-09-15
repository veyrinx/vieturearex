// Arex Network - Native App Theme System
// Platform-specific design tokens following Material 3 (Android) and iOS HIG

import { Platform } from 'react-native';

// ============================================
// BRAND COLORS
// ============================================
export const brand = {
  primary: '#F7931A',        // Arex Orange
  primaryDark: '#E07B0A',
  primaryLight: '#FFB340',
  primaryContainer: '#FFF3E0',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#1A0F00',
  
  secondary: '#0052FF',      // Arex Blue (web primary)
  secondaryDark: '#0041CC',
  secondaryLight: '#4D7CFF',
  secondaryContainer: '#E8F0FE',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#001D6B',
  
  tertiary: '#EA580C',       // Accent Orange-Red
  tertiaryContainer: '#FFF7ED',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#7C2D12',
};

// ============================================
// SEMANTIC COLORS - LIGHT MODE
// ============================================
export const lightColors = {
  // Backgrounds
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  surfaceContainer: '#F0F0F0',
  surfaceContainerHigh: '#E8E8E8',
  surfaceContainerHighest: '#E0E0E0',
  
  // Content
  onBackground: '#1C1B1F',
  onSurface: '#1C1B1F',
  onSurfaceVariant: '#49454F',
  onSurfaceDisabled: '#79747E',
  
  // Outlines
  outline: '#79747E',
  outlineVariant: '#CAC4D0',
  
  // Primary
  primary: brand.primary,
  onPrimary: brand.onPrimary,
  primaryContainer: brand.primaryContainer,
  onPrimaryContainer: brand.onPrimaryContainer,
  
  // Secondary
  secondary: brand.secondary,
  onSecondary: brand.onSecondary,
  secondaryContainer: brand.secondaryContainer,
  onSecondaryContainer: brand.onSecondaryContainer,
  
  // Tertiary
  tertiary: brand.tertiary,
  onTertiary: brand.onTertiary,
  tertiaryContainer: brand.tertiaryContainer,
  onTertiaryContainer: brand.onTertiaryContainer,
  
  // Error
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  
  // Success
  success: '#2E7D32',
  onSuccess: '#FFFFFF',
  successContainer: '#E8F5E9',
  onSuccessContainer: '#1B5E20',
  
  // Warning
  warning: '#F57F17',
  onWarning: '#FFFFFF',
  warningContainer: '#FFF8E1',
  onWarningContainer: '#5C3A00',
  
  // Status
  live: '#EF4444',
  upcoming: '#3B82F6',
  ended: '#9CA3AF',
  
  // Overlay
  scrim: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  
  // Shadow
  shadow: '#000000',
};

// ============================================
// SEMANTIC COLORS - DARK MODE
// ============================================
export const darkColors = {
  // Backgrounds
  background: '#0A0A0A',
  surface: '#141414',
  surfaceVariant: '#1C1C1C',
  surfaceContainer: '#1E1E1E',
  surfaceContainerHigh: '#242424',
  surfaceContainerHighest: '#2C2C2C',
  
  // Content
  onBackground: '#E6E1E5',
  onSurface: '#E6E1E5',
  onSurfaceVariant: '#CAC4D0',
  onSurfaceDisabled: '#79747E',
  
  // Outlines
  outline: '#938F99',
  outlineVariant: '#49454F',
  
  // Primary
  primary: '#FFB340',
  onPrimary: '#1A0F00',
  primaryContainer: '#3D2B00',
  onPrimaryContainer: '#FFDDB3',
  
  // Secondary
  secondary: '#A5C4FF',
  onSecondary: '#001D6B',
  secondaryContainer: '#002F6A',
  onSecondaryContainer: '#D6E4FF',
  
  // Tertiary
  tertiary: '#FFB4A1',
  onTertiary: '#7C2D12',
  tertiaryContainer: '#5C3A00',
  onTertiaryContainer: '#FFF7ED',
  
  // Error
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  
  // Success
  success: '#81C784',
  onSuccess: '#1B5E20',
  successContainer: '#1B5E20',
  onSuccessContainer: '#E8F5E9',
  
  // Warning
  warning: '#FFD54F',
  onWarning: '#5C3A00',
  warningContainer: '#5C3A00',
  onWarningContainer: '#FFF8E1',
  
  // Status
  live: '#FF6B6B',
  upcoming: '#60A5FA',
  ended: '#9CA3AF',
  
  // Overlay
  scrim: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.7)',
  
  // Shadow
  shadow: '#000000',
};

// ============================================
// PLATFORM-SPECIFIC ADJUSTMENTS
// ============================================
export const getColors = (colorScheme: 'light' | 'dark') => {
  const base = colorScheme === 'dark' ? darkColors : lightColors;
  
  return {
    ...base,
    // Platform-specific tweaks
    ...(Platform.OS === 'ios' ? {
      // iOS uses slightly different grays
      surface: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
      surfaceVariant: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
      surfaceContainer: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
      separator: colorScheme === 'dark' ? '#38383A' : '#C6C6C8',
    } : {
      // Android Material 3
      surface: colorScheme === 'dark' ? '#141414' : '#FFFFFF',
      surfaceVariant: colorScheme === 'dark' ? '#1C1C1C' : '#F5F5F5',
      separator: colorScheme === 'dark' ? '#2D2D2D' : '#E0E0E0',
    }),
  };
};

// ============================================
// TYPOGRAPHY - PLATFORM SPECIFIC
// ============================================
export const typography = {
  // iOS - San Francisco
  ios: {
    displayLarge: { fontSize: 57, fontWeight: '400', lineHeight: 64, letterSpacing: -0.25 },
    displayMedium: { fontSize: 45, fontWeight: '400', lineHeight: 52, letterSpacing: 0 },
    displaySmall: { fontSize: 36, fontWeight: '400', lineHeight: 44, letterSpacing: 0 },
    
    headlineLarge: { fontSize: 32, fontWeight: '600', lineHeight: 40, letterSpacing: 0 },
    headlineMedium: { fontSize: 28, fontWeight: '600', lineHeight: 36, letterSpacing: 0 },
    headlineSmall: { fontSize: 24, fontWeight: '600', lineHeight: 32, letterSpacing: 0 },
    
    titleLarge: { fontSize: 22, fontWeight: '600', lineHeight: 28, letterSpacing: 0 },
    titleMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24, letterSpacing: 0.15 },
    titleSmall: { fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },
    
    bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24, letterSpacing: 0.5 },
    bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20, letterSpacing: 0.25 },
    bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 16, letterSpacing: 0.4 },
    
    labelLarge: { fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },
    labelMedium: { fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
    labelSmall: { fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
  },
  
  // Android - Material 3 (Roboto)
  android: {
    displayLarge: { fontSize: 57, fontWeight: '400', lineHeight: 64, letterSpacing: -0.25 },
    displayMedium: { fontSize: 45, fontWeight: '400', lineHeight: 52, letterSpacing: 0 },
    displaySmall: { fontSize: 36, fontWeight: '400', lineHeight: 44, letterSpacing: 0 },
    
    headlineLarge: { fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: 0 },
    headlineMedium: { fontSize: 28, fontWeight: '600', lineHeight: 36, letterSpacing: 0 },
    headlineSmall: { fontSize: 24, fontWeight: '600', lineHeight: 32, letterSpacing: 0 },
    
    titleLarge: { fontSize: 22, fontWeight: '600', lineHeight: 28, letterSpacing: 0 },
    titleMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24, letterSpacing: 0.15 },
    titleSmall: { fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },
    
    bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24, letterSpacing: 0.5 },
    bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20, letterSpacing: 0.25 },
    bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 16, letterSpacing: 0.4 },
    
    labelLarge: { fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },
    labelMedium: { fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
    labelSmall: { fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
  },
};

export const getTypography = () => Platform.OS === 'ios' ? typography.ios : typography.android;

// ============================================
// SPACING & SIZING
// ============================================
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const elevation = {
  none: 0,
  level1: Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : 1,
  level2: Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 } : 2,
  level3: Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 } : 3,
  level4: Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 } : 4,
  level5: Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 5 } : 5,
};

// ============================================
// ANIMATION
// ============================================
export const animation = {
  fast: 150,
  normal: 250,
  slow: 350,
  
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  },
};

// ============================================
// ICON SIZES
// ============================================
export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
  xxxl: 36,
};

// ============================================
// HIT SLOP (TOUCH TARGETS)
// ============================================
export const hitSlop = {
  small: { top: 8, bottom: 8, left: 8, right: 8 },
  medium: { top: 12, bottom: 12, left: 12, right: 12 },
  large: { top: 16, bottom: 16, left: 16, right: 16 },
};

// ============================================
// FULL THEME OBJECT
// ============================================
export const createTheme = (colorScheme: 'light' | 'dark') => ({
  colors: getColors(colorScheme),
  typography: getTypography(),
  spacing,
  borderRadius,
  elevation,
  animation,
  iconSize,
  hitSlop,
  isDark: colorScheme === 'dark',
  platform: Platform.OS,
});

export type Theme = ReturnType<typeof createTheme>;