'use client';

import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { NativeDrawer } from './NativeDrawer';
import { NativeTabBar } from './NativeTabBar';

export function NativeStack() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F7931A',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.95)' : '#0a0a0a',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: Platform.OS === 'ios' ? 10 : 0,
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tabs.Screen
        name="(tabs)/home"
        options={{
          title: 'Trang Chủ',
          tabBarIcon: ({ focused, color, size }) => (
            <NativeTabBar.Icon name="home" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/news"
        options={{
          title: 'Tin Tức',
          tabBarIcon: ({ focused, color, size }) => (
            <NativeTabBar.Icon name="newspaper" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/events"
        options={{
          title: 'Sự Kiện',
          tabBarIcon: ({ focused, color, size }) => (
            <NativeTabBar.Icon name="calendar" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/community"
        options={{
          title: 'Cộng Đồng',
          tabBarIcon: ({ focused, color, size }) => (
            <NativeTabBar.Icon name="users" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/profile"
        options={{
          title: 'Cá Nhân',
          tabBarIcon: ({ focused, color, size }) => (
            <NativeTabBar.Icon name="user" focused={focused} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}