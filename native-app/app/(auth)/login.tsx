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
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { GlassCard, HeroCard } from '@/components/ui/GlassCard';

export default function LoginScreen() {
  const { signIn, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const { colors, typography, spacing } = theme;
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
      router.replace('/(tabs)/home');
    }
  };

  const handleGoogleSignIn = async () => {
    Alert.alert('Thông báo', 'Đăng nhập Google đang được phát triển');
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
                <Ionicons name="flame" size={36} color="#fff" />
              </View>
              <Text style={[typography.headlineMedium, { color: colors.onSurface, marginTop: spacing.md, fontWeight: '700' }]}>Arex Network</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginTop: spacing.xs }]}>Cộng đồng Free Fire Việt Nam</Text>
            </View>
          </AnimatedView>

          {/* Login Form */}
          <AnimatedView enterAnimation="slideUp" delay={200} style={styles.formSection}>
            <GlassCard variant="elevated" padding="lg" style={styles.formCard}>
              <Text style={[typography.headlineSmall, { color: colors.onSurface, marginBottom: spacing.xs }]}>Đăng nhập</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: spacing.lg }]}>Nhập thông tin để truy cập tài khoản</Text>

              {error && (
                <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <Text style={[typography.bodySmall, { color: '#EF4444', marginLeft: spacing.sm, flex: 1 }]}>{error}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[typography.labelMedium, { color: colors.onSurface, marginBottom: spacing.xs }]}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail" size={20} color={colors.onSurfaceVariant} />
                  <TextInput
                    style={[styles.input, { color: colors.onSurface, paddingLeft: spacing.lg }]}
                    placeholder="example@email.com"
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
                    autoComplete="password"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.forgotPassword} onPress={() => {}}>
                <Text style={[typography.labelMedium, { color: colors.primary, fontWeight: '600' }]}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
              >
                <Text style={styles.loginBtnText}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
              </TouchableOpacity>
            </GlassCard>
          </AnimatedView>

          {/* Divider */}
          <AnimatedView enterAnimation="fade" delay={300} style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.outlineVariant }]} />
            <Text style={[typography.labelMedium, { color: colors.onSurfaceVariant }]}>Hoặc</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.outlineVariant }]} />
          </AnimatedView>

          {/* Social Login */}
          <AnimatedView enterAnimation="slideUp" delay={350} style={styles.socialSection}>
            <TouchableOpacity 
              style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
              onPress={handleGoogleSignIn}
              activeOpacity={0.8}
            >
              <View style={styles.socialIcon}>
                <Text style={{ fontSize: 22 }}>G</Text>
              </View>
              <Text style={[typography.labelLarge, { color: colors.onSurface, fontWeight: '600' }]}>Tiếp tục với Google</Text>
            </TouchableOpacity>
          </AnimatedView>

          {/* Register Link */}
          <AnimatedView enterAnimation="fade" delay={400} style={styles.registerSection}>
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[typography.bodyMedium, { color: colors.primary, fontWeight: '700' }]}>Đăng ký ngay</Text>
            </TouchableOpacity>
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
    width: 96, 
    height: 96, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#F7931A', 
    shadowOffset: { width: 0, height: 12 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 24, 
    elevation: 12,
  },
  formSection: { marginBottom: spacing.lg },
  formCard: { width: '100%' },
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
    borderRadius: 12, 
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceVariant 
  },
  input: { 
    flex: 1, 
    paddingVertical: spacing.md, 
    fontSize: 16, 
  },
  forgotPassword: { alignSelf: 'flex-end', marginTop: spacing.xs, marginBottom: spacing.lg },
  loginBtn: { 
    paddingVertical: spacing.md, 
    borderRadius: 12, 
    alignItems: 'center', 
    shadowColor: '#F7931A', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 16, 
    elevation: 8,
  },
  loginBtnText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#fff', 
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg, gap: spacing.md },
  dividerLine: { flex: 1, height: 1 },
  socialSection: { marginBottom: spacing.lg },
  socialBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: spacing.md, 
    paddingVertical: spacing.md, 
    borderRadius: 12, 
    borderWidth: 1,
  },
  socialIcon: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  registerSection: { marginTop: spacing.md },
});

import { useState } from 'react';