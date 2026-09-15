// Arex Hub - Admin App Theme System
// Professional dark theme for dashboard/admin interfaces
// Optimized for data density, readability, and long sessions

import { Platform } from 'react-native';

// ============================================
// BRAND COLORS - ADMIN (Dark Professional)
// ============================================
export const adminBrand = {
  primary: '#00D4AA',        // Teal/Green - success, active
  primaryDark: '#00B896',
  primaryLight: '#33E0C0',
  primaryContainer: '#004D3A',
  onPrimary: '#001F15',
  onPrimaryContainer: '#A7F3D0',
  
  secondary: '#6366F1',      // Indigo - secondary actions
  secondaryDark: '#4F46E5',
  secondaryLight: '#818CF8',
  secondaryContainer: '#1E1B4B',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#C7D2FE',
  
  accent: '#F59E0B',         // Amber - warnings, highlights
  accentContainer: '#451A03",
  onAccent: '#FFFFFF',
  onAccentContainer: '#FDE68A',
  
  danger: '#EF4444',         // Red - destructive
  dangerContainer: '#450A0A",
  onDanger: '#FFFFFF',
  onDangerContainer: '#FECACA',
};

// ============================================
// SEMANTIC COLORS - DARK MODE (Primary for Admin)
// ============================================
export const adminColors = {
  // Backgrounds - Deep dark for reduced eye strain
  background: '#080C14',          // Almost black
  surface: '#0F172A',             // Slate 900
  surfaceVariant: '#1E293B',      // Slate 800
  surfaceContainer: '#1E293B',    
  surfaceContainerHigh: '#263246', // Slightly lighter
  surfaceContainerHighest: '#334155', // Slate 700
  
  // Content
  onBackground: '#F1F5F9',        // Slate 100
  onSurface: '#F1F5F9',
  onSurfaceVariant: '#94A3B8',    // Slate 400
  onSurfaceDisabled: '#64748B',   // Slate 500
  
  // Outlines
  outline: '#334155',             // Slate 700
  outlineVariant: '#1E293B',      // Slate 800
  
  // Primary (Teal)
  primary: adminBrand.primary,
  onPrimary: adminBrand.onPrimary,
  primaryContainer: adminBrand.primaryContainer,
  onPrimaryContainer: adminBrand.onPrimaryContainer,
  
  // Secondary (Indigo)
  secondary: adminBrand.secondary,
  onSecondary: adminBrand.onSecondary,
  secondaryContainer: adminBrand.secondaryContainer,
  onSecondaryContainer: adminBrand.onSecondaryContainer,
  
  // Accent (Amber)
  accent: adminBrand.accent,
  onAccent: adminBrand.onAccent,
  accentContainer: adminBrand.accentContainer,
  onAccentContainer: adminBrand.onAccentContainer,
  
  // Danger (Red)
  danger: adminBrand.danger,
  onDanger: adminBrand.onDanger,
  dangerContainer: adminBrand.dangerContainer,
  onDangerContainer: adminBrand.onDangerContainer,
  
  // Success
  success: '#10B981',
  successContainer: '#064E3B',
  onSuccess: '#FFFFFF',
  onSuccessContainer: '#A7F3D0',
  
  // Warning
  warning: '#F59E0B',
  warningContainer: '#451A03",
  onWarning: '#FFFFFF',
  onWarningContainer: '#FDE68A',
  
  // Info
  info: '#3B82F6',
  infoContainer: '#1E3A5F',
  onInfo: '#FFFFFF',
  onInfoContainer: '#BFDBFE',
  
  // Status
  live: '#EF4444',
  upcoming: '#3B82F6',
  ended: '#64748B',
  pending: '#F59E0B',
  
  // Data visualization
  chart: {
    primary: '#00D4AA',
    secondary: '#6366F1',
    tertiary: '#F59E0B',
    quaternary: '#EF4444',
    quinary: '#8B5CF6',
    senary: '#06B6D4',
  },
  
  // Overlay
  scrim: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.6)',
  
  // Shadow
  shadow: '#000000',
  
  // Table/Data grid
  tableHeader: '#1E293B',
  tableRow: '#0F172A',
  tableRowAlt: '#1E293B",
  tableHover: '#263246',
  tableBorder: '#1E293B",
};

// ============================================
// LIGHT MODE (Optional for Admin)
// ============================================
export const adminLightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  surfaceContainer: '#F1F5F9',
  surfaceContainerHigh: '#E2E8F0',
  surfaceContainerHighest: '#CBD5E1',
  
  onBackground: '#0F172A',
  onSurface: '#0F172A',
  onSurfaceVariant: '#475569',
  onSurfaceDisabled: '#94A3B8',
  
  outline: '#E2E8F0',
  outlineVariant: '#CBD5E1',
  
  primary: '#00B896',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D1FAE5',
  onPrimaryContainer: '#064E3B',
  
  secondary: '#6366F1',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E0E7FF",
  onSecondaryContainer: '#312E81",
  
  accent: '#D97706',
  accentContainer: '#FEF3C7",
  onAccent: '#FFFFFF',
  onAccentContainer: '#92400E",
  
  danger: '#EF4444",
  onDanger: '#FFFFFF',
  dangerContainer: '#FEE2E2",
  onDangerContainer: '#991B1B",
  
  success: '#10B981",
  successContainer: '#D1FAE5",
  onSuccess: '#FFFFFF",
  onSuccessContainer: '#064E3B",
  
  warning: '#F59E0B",
  warningContainer: '#FEF3C7",
  onWarning: '#FFFFFF",
  onWarningContainer: '#92400E",
  
  info: '#3B82F6",
  infoContainer: '#DBEAFE",
  onInfo: '#FFFFFF",
  onInfoContainer: '#1E3A5F",
  
  live: '#EF4444",
  upcoming: '#3B82F6",
  ended: '#64748B",
  pending: '#F59E0B",
  
  chart: {
    primary: '#00B896",
    secondary: '#6366F1",
    tertiary: '#F59E0B",
    quaternary: '#EF4444",
    quinary: '#8B5CF6",
    senary: '#06B6D4",
  },
  
  scrim: '#000000",
  backdrop: 'rgba(0, 0, 0, 0.4)",
  shadow: '#000000",
  
  tableHeader: '#F1F5F9",
  tableRow: '#FFFFFF",
  tableRowAlt: '#F8FAFC",
  tableHover: '#F1F5F9",
  tableBorder: '#E2E8F0",
};

// ============================================
// TYPOGRAPHY - Admin (Monospace for data)
// ============================================
export const adminTypography = {
  // Display
  displayLarge: { fontSize: 48, fontWeight: '700', lineHeight: 56, letterSpacing: -0.5 },
  displayMedium: { fontSize: 36, fontWeight: '600', lineHeight: 44, letterSpacing: -0.25 },
  displaySmall: { fontSize: 28, fontWeight: '600', lineHeight: 36, letterSpacing: 0 },
  
  // Headlines
  headlineLarge: { fontSize: 24, fontWeight: '700', lineHeight: 32, letterSpacing: 0 },
  headlineMedium: { fontSize: 20, fontWeight: '600', lineHeight: 28, letterSpacing: 0 },
  headlineSmall: { fontSize: 18, fontWeight: '600', lineHeight: 24, letterSpacing: 0 },
  
  // Titles
  titleLarge: { fontSize: 16, fontWeight: '600', lineHeight: 24, letterSpacing: 0.1 },
  titleMedium: { fontSize: 14, fontWeight: '600', lineHeight: 20, letterSpacing: 0.1 },
  titleSmall: { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 0.1 },
  
  // Body
  bodyLarge: { fontSize: 14, fontWeight: '400', lineHeight: 22, letterSpacing: 0.25 },
  bodyMedium: { fontSize: 13, fontWeight: '400', lineHeight: 20, letterSpacing: 0.25 },
  bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 18, letterSpacing: 0.25 },
  
  // Labels
  labelLarge: { fontSize: 13, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },
  labelMedium: { fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
  labelSmall: { fontSize: 10, fontWeight: '500', lineHeight: 14, letterSpacing: 0.5 },
  
  // Monospace for data
  monoLarge: { fontSize: 16, fontWeight: '500', lineHeight: 24, fontFamily: 'monospace', letterSpacing: 0 },
  monoMedium: { fontSize: 13, fontWeight: '500', lineHeight: 20, fontFamily: 'monospace', letterSpacing: 0 },
  monoSmall: { fontSize: 11, fontWeight: '500', lineHeight: 16, fontFamily: 'monospace', letterSpacing: 0 },
};

// ============================================
// SPACING - Compact for data density
// ============================================
export const adminSpacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ============================================
// BORDER RADIUS - Sharper for professional look
// ============================================
export const adminBorderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  full: 9999,
};

// ============================================
// ELEVATION - Subtle for dark theme
// ============================================
export const adminElevation = {
  none: 0,
  level1: Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 1 } : 1,
  level2: Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 } : 2,
  level3: Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 } : 3,
  level4: Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 } : 4,
};

// ============================================
// DATA TABLE SPECIFIC
// ============================================
export const table = {
  headerHeight: 44,
  rowHeight: 48,
  compactRowHeight: 36,
  cellPadding: { horizontal: 12, vertical: 8 },
  headerPadding: { horizontal: 12, vertical: 10 },
  sortIconSize: 14,
  actionIconSize: 18,
  rowGap: 0,
  borderWidth: 1,
  borderColor: '#1E293B',
};

// ============================================
// ICON SIZES
// ============================================
export const adminIconSize = {
  xs: 12,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 28,
};

// ============================================
// HIT SLOP
// ============================================
export const adminHitSlop = {
  small: { top: 6, bottom: 6, left: 6, right: 6 },
  medium: { top: 8, bottom: 8, left: 8, right: 8 },
  large: { top: 12, bottom: 12, left: 12, right: 12 },
};

// ============================================
// ANIMATION - Fast for productivity
// ============================================
export const adminAnimation = {
  fast: 100,
  normal: 150,
  slow: 200,
  
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  },
};

// ============================================
// FULL THEME OBJECT
// ============================================
export const createAdminTheme = (colorScheme: 'dark' | 'light' = 'dark') => ({
  colors: colorScheme === 'dark' ? adminColors : adminLightColors,
  typography: adminTypography,
  spacing: adminSpacing,
  borderRadius: adminBorderRadius,
  elevation: adminElevation,
  animation: adminAnimation,
  iconSize: adminIconSize,
  hitSlop: adminHitSlop,
  table,
  isDark: colorScheme === 'dark',
  platform: Platform.OS,
  isAdmin: true,
});

export type AdminTheme = ReturnType<typeof createAdminTheme>;