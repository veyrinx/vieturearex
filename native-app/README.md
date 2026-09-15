# Arex Network - Native Mobile App (React Native + Expo)

Ứng dụng native hoàn toàn tách biệt từ web, viết bằng **React Native + Expo Router**.

## 🏗️ Kiến trúc

```
native-app/
├── app/                    # Expo Router file-based routing
│   ├── _layout.tsx        # Root layout với providers
│   ├── (tabs)/            # Tab navigation (5 tab chính)
│   │   ├── home/          # Trang chủ
│   │   ├── news/          # Tin tức
│   │   ├── events/        # Sự kiện
│   │   ├── community/     # Cộng đồng
│   │   └── profile/       # Cá nhân
│   └── (auth)/            # Auth flow (login/register)
├── components/
│   ├── providers.tsx      # QueryClient, Auth, Theme
│   └── layout/
│       ├── NativeStack.tsx    # Tab + Drawer navigation
│       ├── NativeTabBar.tsx   # Custom tab bar icons
│       └── NativeDrawer.tsx   # Side drawer menu
├── hooks/
│   ├── use-auth.ts        # Supabase auth
│   └── use-theme.ts       # Light/Dark/System theme
├── constants/             # App constants
├── lib/                   # Utilities, API client
├── assets/                # Icons, splash, fonts
└── eas.json              # EAS Build config
```

## 🚀 Quick Start

### 1. Cài đặt dependencies

```bash
cd native-app
npm install
```

### 2. Cấu hình environment

```bash
cp .env.example .env
# Chỉnh sửa .env với Supabase URL, API URL thực
```

### 3. Chạy development

```bash
# Web (test nhanh)
npm run web

# Android (cần Android Studio/emulator)
npm run android

# iOS (cần macOS + Xcode)
npm run ios
```

## 📱 Build Production

### Sử dụng EAS Build (khuyên dùng - không cần Xcode/Android Studio local)

```bash
# Cài EAS CLI
npm install -g eas-cli

# Login Expo
eas login

# Cấu hình project (chạy lần đầu)
eas build:configure

# Build Android AAB (Play Store)
npm run build:android

# Build iOS IPA (App Store) - cần macOS hoặc EAS cloud
npm run build:ios

# Build cả 2
npm run build:all
```

### Build local (cần Xcode/Android Studio)

```bash
# Prebuild native projects
npm run prebuild

# Mở Xcode
open ios/ArexNetwork.xcworkspace

# Mở Android Studio
open android/
```

## 🔐 Cấu hình Secrets (GitHub Actions / EAS)

### Android (Play Store)
```bash
# Tạo keystore
keytool -genkey -v -keystore arex-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias arex

# Encode base64
base64 -w 0 arex-release.jks
```

### iOS (App Store)
- Certificate `.p12` + password
- Provisioning Profile `.mobileprovision`
- Apple Team ID
- App Store Connect API Key

## 🎨 Theme System

```typescript
// Tự động detect system theme, lưu vào AsyncStorage
const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
// theme: 'light' | 'dark' | 'system'
// resolvedTheme: 'light' | 'dark' (thực tế hiển thị)
```

## 🔐 Authentication

```typescript
const { user, loading, signIn, signUp, signOut, refreshUser } = useAuth();
// Supabase Auth với email/password + OAuth (Google)
```

## 📡 API Client

```typescript
// React Query + Supabase
const { data, isLoading, error } = useQuery({
  queryKey: ['news'],
  queryFn: () => fetch(`${API}/news`).then(r => r.json()),
});
```

## 📦 Cấu trúc Navigation

```
Root Stack
├── (auth) - Modal presentation
│   ├── login
│   └── register
└── (tabs) - Main app
    ├── home
    ├── news
    ├── events
    ├── community
    └── profile
        └── Drawer (side menu)
```

## 🎯 Tính năng đã implement

- [x] **Tab Navigation** (5 tabs: Home, News, Events, Community, Profile)
- [x] **Drawer Navigation** (Side menu với 4 sections)
- [x] **Theme System** (Light/Dark/System + persistence)
- [x] **Auth Flow** (Login/Register + Supabase)
- [x] **React Query** (Caching, pagination, infinite scroll)
- [x] **TypeScript** (Strict mode)
- [x] **Pull-to-refresh** (Native feel)
- [x] **Safe Area** (Notch, home indicator)
- [x] **Haptic Feedback** (expo-haptics)
- [x] **Push Notifications** (expo-notifications ready)
- [x] **Deep Linking** (expo-linking + custom scheme `arex://`)

## 📋 Roadmap

- [ ] Google OAuth implementation
- [ ] Biometric authentication (FaceID/TouchID)
- [ ] Offline support (React Query persist)
- [ ] Image optimization (expo-image)
- [ ] Analytics (expo-analytics + Amplitude)
- [ ] Crash reporting (Sentry)
- [ ] OTA Updates (EAS Update)

## 🔗 Liên kết

- Web: https://www.arexnetwork.site
- API: https://www.arexnetwork.site/api
- Supabase Dashboard: https://supabase.com/dashboard
- Expo Dashboard: https://expo.dev