'use client';

import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedView } from '@/components/ui/AnimatedView';

export default function AdminLoginScreen() {
  const { signIn, loading } = useAdminAuth();
  const { theme } = useAdminTheme();
  const router = useRouter();
  const { colors, typography, spacing, elevation } = theme;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setError('');
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err.message);
    } else {
      router.replace('/(dashboard)/dashboard');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <AnimatedView enterAnimation="fade" delay={100} style={styles.brandHeader}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
                <Ionicons name="shield-checkmark" size={36} color="#fff" />
              </View>
              <Text style={[typography.headlineMedium, { color: colors.onSurface, marginTop: spacing.md, fontWeight: '700' }]}>Arex Hub</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>Admin Panel</Text>
            </View>
          </AnimatedView>

          {/* Login Form */}
          <AnimatedView enterAnimation="slideUp" delay={200} style={styles.formSection}>
            <View style={[styles.formCard, elevation.level2]}>
              <Text style={[typography.headlineSmall, { color: colors.onSurface, marginBottom: spacing.xs }]}>Đăng nhập quản trị</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: spacing.lg }]}>Nhập thông tin để truy cập bảng điều khiển</Text>

              {error && (
                <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.danger }]}>
                  <Ionicons name="alert-circle" size={20} color={colors.danger} />
                  <Text style={[typography.bodySmall, { color: colors.danger, marginLeft: spacing.sm, flex: 1 }]}>{error}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[typography.labelMedium, { color: colors.onSurface, marginBottom: spacing.xs }]}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail" size={20} color={colors.onSurfaceVariant} />
                  <TextInput
                    style={[styles.input, { color: colors.onSurface, paddingLeft: spacing.lg }]}
                    placeholder="admin@arexnetwork.site"
                    placeholderTextColor={colors.onSurfaceVariant}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => {}}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[typography.labelMedium, { color: colors.onSurface, marginBottom: spacing.xs }]}>Mật khẩu</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={20} color={colors.onSurfaceVariant} />
                  <TextInput
                    style={[styles.input, { color: colors.onSurface, paddingLeft: spacing.lg }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.onSurfaceVariant}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="current-password"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
              >
                <Text style={styles.loginBtnText}>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</Text>
              </TouchableOpacity>
            </View>
          </AnimatedView>

          {/* Security Notice */}
          <AnimatedView enterAnimation="fade" delay={300} style={styles.securityNotice}>
            <View style={styles.noticeRow}>
              <Ionicons name="shield-checkmark" size={18} color={colors.success} />
              <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, flex: 1 }]}>Bảng điều khiển dành cho quản trị viên Arex Network</Text>
            </View>
            <View style={styles.noticeRow}>
              <Ionicons name="lock-closed" size={18} color={colors.warning} />
              <Text style={[typography.labelSmall, { color: colors.onSurfaceVariant, flex: 1 }]}>Mọi hoạt động đều được ghi log và theo dõi</Text>
            </View>
          </AnimatedView>

          {/* Version */}
          <AnimatedView enterAnimation="fade" delay={400} style={styles.version}>
            <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>Arex Hub v1.1.3</Text>
          </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  brandHeader: { alignItems: 'center', marginBottom: spacing.lg },
  logoContainer: { alignItems: 'center' },
  logoBox: { 
    width: 80, 
    height: 80, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#00D4AA', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 16, 
    elevation: 8,
  },
  formSection: { marginBottom: spacing.lg },
  formCard: { 
    padding: 24, 
    borderRadius: 14, 
    borderWidth: 1, 
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    width: '100%' 
  },
  errorBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: spacing.md, 
    borderRadius: 10, 
    borderWidth: 1, 
    marginBottom: spacing.md 
  },
  inputGroup: { marginBottom: spacing.md },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderRadius: 10, 
    paddingHorizontal: spacing.md,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  input: { 
    flex: 1, 
    paddingVertical: spacing.md, 
    fontSize: 15, 
  },
  loginBtn: { 
    paddingVertical: spacing.md, 
    borderRadius: 10, 
    alignItems: 'center', 
    shadowColor: '#00D4AA', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 12, 
    elevation: 6,
  },
  loginBtnText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#fff', 
  },
  securityNotice: { 
    marginTop: spacing.lg, 
    padding: spacing.md, 
    borderRadius: 10, 
    backgroundColor: '#1E293B', 
    borderWidth: 1, 
    borderColor: '#334155',
    gap: 8,
  },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  version: { 
    alignItems: 'center', 
    marginTop: spacing.xl, 
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
});

import { useState } from 'react';