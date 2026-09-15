'use client';

import { View, ViewStyle, ReactNode, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'surface' | 'outline' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  onPress?: () => void;
  hitSlop?: ViewStyle;
  testID?: string;
}

const paddingMap = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
};

const radiusMap = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export function GlassCard({
  children,
  style,
  variant = 'surface',
  padding = 'md',
  borderRadius = 'lg',
  onPress,
  hitSlop,
  testID,
}: GlassCardProps) {
  const { theme } = useTheme();
  const { colors, elevation, borderRadius: br } = theme;
  const isDark = theme.isDark;

  const baseStyle: ViewStyle = {
    padding: paddingMap[padding],
    borderRadius: radiusMap[borderRadius],
    backgroundColor: colors.surface,
  };

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: colors.primaryContainer,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: colors.secondaryContainer,
      borderWidth: 0,
    },
    surface: {
      backgroundColor: colors.surface,
      borderWidth: 0,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    elevated: {
      backgroundColor: colors.surface,
      borderWidth: 0,
      ...elevation.level2,
    },
  };

  const finalStyle = [
    baseStyle,
    variantStyles[variant],
    style,
  ];

  const Component = onPress ? View : View;

  return (
    <Component
      style={finalStyle}
      onPress={onPress}
      hitSlop={onPress ? theme.hitSlop.medium : undefined}
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { disabled: false } : undefined}
    >
      {children}
    </Component>
  );
}

// Specialized card variants
export function HeroCard({ children, style, ...props }: GlassCardProps) {
  const { theme } = useTheme();
  return (
    <GlassCard
      variant="elevated"
      padding="lg"
      borderRadius="xl"
      style={[
        {
          backgroundColor: theme.isDark ? '#1E1E1E' : '#FFFFFF',
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </GlassCard>
  );
}

export function ContentCard({ children, style, ...props }: GlassCardProps) {
  const { theme } = useTheme();
  return (
    <GlassCard
      variant="outline"
      padding="md"
      borderRadius="lg"
      style={[
        {
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </GlassCard>
  );
}

export function CompactCard({ children, style, ...props }: GlassCardProps) {
  return (
    <GlassCard
      variant="surface"
      padding="sm"
      borderRadius="md"
      style={style}
      {...props}
    >
      {children}
    </GlassCard>
  );
}