'use client';

import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { ReactNode } from 'react';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface AdminMetricCardProps {
  title: string;
  value: string | number;
  change?: string | null;
  icon?: string;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  onPress?: () => void;
}

export function AdminMetricCard({ title, value, change, icon, iconColor, trend = 'neutral', onPress }: AdminMetricCardProps) {
  const { theme, colors, typography, spacing, borderRadius, elevation } = useAdminTheme();
  const [animValue] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const animatedScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  const animatedOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const trendColor = trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.onSurfaceVariant;
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: animatedScale }], opacity: animatedOpacity, ...elevation.level2 }]}>
      <TouchableOpacity style={styles.cardInner} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.header}>
          <Text style={[typography.labelMedium, { color: colors.onSurfaceVariant }]}>{title}</Text>
          {icon && (
            <View style={[styles.iconWrapper, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
              <Ionicons name={icon} size={20} color={iconColor || colors.primary} />
            </View>
          )}
        </View>
        <Text style={[typography.displaySmall, { color: colors.onSurface, marginTop: spacing.sm, fontWeight: '700' }]}>{value}</Text>
        {change && (
          <View style={styles.changeRow}>
            <Ionicons name={trendIcon} size={14} color={trendColor} />
            <Text style={[typography.labelSmall, { color: trendColor, fontWeight: '600', marginLeft: 4 }]}>{change}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

interface AdminStatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  onPress?: () => void;
}

export function AdminStatCard({ label, value, icon, color, onPress }: AdminStatCardProps) {
  const { theme, colors, typography, spacing, elevation } = useAdminTheme();

  return (
    <TouchableOpacity style={[styles.statCard, elevation.level1, { borderColor: color + '30', backgroundColor: color + '10' }]} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[typography.titleMedium, { color: colors.onSurface, marginTop: 8, fontWeight: '700' }]}>{value}</Text>
      <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, marginTop: 2 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface AdminDataTableProps<T> {
  columns: Array<{
    key: string;
    header: string;
    width?: string | number;
    render?: (value: any) => ReactNode | { label: string; color: string };
  }>;
  data: T[];
  rowHeight?: number;
  compact?: boolean;
  onRowPress?: (item: T) => void;
}

export function AdminDataTable<T>({ columns, data, rowHeight = 48, compact = false, onRowPress }: AdminDataTableProps<T>) {
  const { theme, colors, typography, spacing, borderRadius, table } = useAdminTheme();

  if (!data.length) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="documents-outline" size={48} color={colors.onSurfaceVariant} />
        <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }]}>Không có dữ liệu</Text>
      </View>
    );
  }

  return (
    <View style={styles.tableContainer}>
      {/* Header */}
      <View style={[styles.tableHeader, { backgroundColor: colors.tableHeader, borderBottomWidth: table.borderWidth, borderBottomColor: table.borderColor }]}>
        {columns.map((col) => (
          <View key={col.key} style={[styles.headerCell, { width: col.width, minWidth: 80, flex: col.width === 'auto' ? 1 : 0 }]}>
            <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }]}>{col.header}</Text>
          </View>
        ))}
      </View>
      
      {/* Rows */}
      <View style={styles.tableBody}>
        {data.map((item, index) => (
          <TouchableOpacity
            key={String(index)}
            style={[
              styles.tableRow,
              index % 2 === 1 && { backgroundColor: colors.tableRowAlt },
              { height: rowHeight, borderBottomWidth: table.borderWidth, borderBottomColor: table.borderColor }
            ]}
            onPress={() => onRowPress?.(item)}
            activeOpacity={0.8}
          >
            {columns.map((col) => {
              const value = (item as any)[col.key];
              const rendered = col.render ? col.render(value) : value;
              const isLabel = typeof rendered === 'object' && rendered !== null && 'label' in rendered;
              
              return (
                <View key={col.key} style={[styles.tableCell, { width: col.width, minWidth: 80, flex: col.width === 'auto' ? 1 : 0 }]}>
                  {isLabel ? (
                    <View style={styles.badgeContainer}>
                      <View style={[styles.badge, { backgroundColor: (rendered as any).color + '20' }]}>
                        <Text style={[typography.labelSmall, { color: (rendered as any).color, fontWeight: '600' }]}>{(rendered as any).label}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={[typography.bodySmall, { color: colors.onSurface }]}>{String(value)}</Text>
                  )}
                </View>
              );
            })}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

interface AdminChartCardProps {
  title: string;
  data: number[];
  labels: string[];
  color: string;
  type?: 'line' | 'area' | 'bar' | 'radial';
  formatValue?: (v: number) => string;
  showLegend?: boolean;
  height?: number;
}

export function AdminChartCard({ title, data, labels, color, type = 'line', formatValue, showLegend, height = 200 }: AdminChartCardProps) {
  const { theme, colors, typography, spacing } = useAdminTheme();
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  return (
    <View style={[styles.chartCard, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline }]}>
      <View style={styles.chartHeader}>
        <Text style={[typography.titleSmall, { color: colors.onSurface }]}>{title}</Text>
        {showLegend && (
          <View style={styles.legend}>
            <View style={[styles.legendItem, { backgroundColor: color + '20' }]}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, marginLeft: 4 }]}>Giá trị</Text>
            </View>
          </View>
        )}
      </View>
      
      <View style={[styles.chartArea, { height }]}>
        {type === 'radial' ? (
          <View style={styles.radialContainer}>
            {data.map((value, index) => (
              <View key={index} style={styles.radialItem}>
                <View style={styles.radialProgress}>
                  <View 
                    style={[
                      styles.radialArc,
                      { 
                        width: 80 - index * 16, 
                        height: 80 - index * 16,
                        borderColor: color,
                      ]}
                  />
                </View>
                <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }]}>{labels[index]}</Text>
                <Text style={[typography.monoMedium, { color: colors.onSurface, textAlign: 'center' }]}>{formatValue ? formatValue(value) : value}</Text>
              </View>
            ))}
          </View>
        ) : type === 'bar' ? (
          <View style={styles.barContainer}>
            {data.map((value, index) => (
              <View key={index} style={styles.barItem}>
                <Animated.View
                  style={[
                    styles.bar,
                    { 
                      height: (value / Math.max(...data)) * 120,
                      backgroundColor: color,
                    ]}
                  >
                    <Text style={[styles.barValue, { color: colors.onSurface }]}>{formatValue ? formatValue(value) : value}</Text>
                  </Animated.View>
                <Text style={[styles.barLabel, { color: colors.onSurfaceVariant }]}>{labels[index]}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.lineContainer}>
            {/* Simplified line chart - in production use react-native-svg-charts */}
            <View style={styles.chartPlaceholder}>
              <Ionicons name="analytics" size={48} color={colors.onSurfaceVariant} />
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }]}>
                Biểu đồ {type} (${data.length} điểm dữ liệu)
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    borderRadius: 10, 
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
  },
  cardInner: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  iconWrapper: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  cardInner: { padding: 16 },
  
  statCard: { 
    padding: 16, 
    borderRadius: 10, 
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
    flex: 1,
  },
  statIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  
  tableContainer: { borderRadius: 10, overflow: 'hidden', borderWidth: 1 },
  tableHeader: { flexDirection: 'row', alignItems: 'center' },
  headerCell: { paddingHorizontal: 12, paddingVertical: 10 },
  tableBody: {},
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  tableCell: { paddingHorizontal: 12, paddingVertical: 8, flex: 1, minWidth: 80 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  emptyState: { padding: 48, alignItems: 'center' },
  
  chartCard: { borderRadius: 10, overflow: 'hidden' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  chartArea: { padding: 16 },
  chartPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  radialContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 160 },
  radialItem: { alignItems: 'center' },
  radialProgress: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  radialArc: { position: 'absolute', borderWidth: 8, borderRadius: 40, borderStyle: 'solid' },
  barContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 160, paddingHorizontal: 16 },
  barItem: { alignItems: 'center', flex: 1 },
  bar: { width: '100%', borderRadius: 4, justifyContent: 'flex-end', paddingBottom: 4, minHeight: 4 },
  barValue: { position: 'absolute', top: -20, left: 0, right: 0, textAlign: 'center', fontSize: 10 },
  barLabel: { marginTop: 8, fontSize: 10, textAlign: 'center' },
  lineContainer: { height: 140 },
  radialArc: { position: 'absolute', borderWidth: 8, borderRadius: 40, borderStyle: 'solid' },
});

import { useState, useEffect } from 'react';