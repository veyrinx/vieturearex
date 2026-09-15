'use client';

import { LucideIcon } from 'lucide-react-native';
import { Platform, TextStyle } from 'react-native';

interface IconProps {
  name: string;
  focused: boolean;
  color: string;
  size: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
  home: 'Home',
  newspaper: 'Newspaper',
  calendar: 'Calendar',
  users: 'Users',
  user: 'User',
  trophy: 'Trophy',
  flame: 'Flame',
  messageSquare: 'MessageSquare',
  settings: 'Settings',
  star: 'Star',
  shield: 'Shield',
  sword: 'Sword',
  heart: 'Heart',
  bell: 'Bell',
  menu: 'Menu',
  x: 'X',
  chevronDown: 'ChevronDown',
  chevronUp: 'ChevronUp',
  chevronLeft: 'ChevronLeft',
  chevronRight: 'ChevronRight',
  search: 'Search',
  plus: 'Plus',
  edit: 'Edit',
  trash: 'Trash',
  save: 'Save',
  share: 'Share',
  download: 'Download',
  upload: 'Upload',
  copy: 'Copy',
  link: 'Link',
  externalLink: 'ExternalLink',
  refresh: 'RefreshCw',
  loader: 'Loader',
  error: 'AlertTriangle',
  warning: 'AlertTriangle',
  success: 'CheckCircle',
  info: 'Info',
  play: 'Play',
  pause: 'Pause',
  stop: 'Stop',
  volume: 'Volume2',
  mute: 'VolumeX',
  fullscreen: 'Maximize',
  minimize: 'Minimize',
  grid: 'Grid',
  list: 'List',
  filter: 'Filter',
  sort: 'ArrowUpDown',
  more: 'MoreHorizontal',
  back: 'ArrowLeft',
  forward: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

export function Icon({ name, focused, color, size }: IconProps) {
  const IconComponent = ICON_MAP[name] ? require('lucide-react-native')[ICON_MAP[name]] : require('lucide-react-native').HelpCircle;
  
  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={focused ? 2.5 : 2}
      style={{
        opacity: focused ? 1 : 0.7,
        transform: [{ scale: focused ? 1.05 : 1 }],
      }}
    />
  );
}

export function TabBarLabel({ focused, children, style }: { focused: boolean; children: React.ReactNode; style: TextStyle }) {
  return (
    <Text
      style={[
        style,
        {
          fontSize: 10,
          fontWeight: focused ? '700' : '500',
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },
      ]}
    >
      {children}
    </Text>
  );
}