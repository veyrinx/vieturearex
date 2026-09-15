'use client';

import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { PlatformSelect } from 'expo-router';

const colors = {
  light: {
    background: '#fafafa',
    card: '#ffffff',
    border: '#e4e4e7',
    text: '#0a0a0a',
    textMuted: '#71717a',
    primary: '#F7931A',
    primaryLight: 'rgba(247, 147, 26, 0.15)',
    danger: '#ef4444',
  },
  dark: {
    background: '#0a0a0a',
    card: '#141414',
    border: '#262626',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    primary: '#F7931A',
    primaryLight: 'rgba(247, 147, 26, 0.15)',
    danger: '#ef4444',
  },
};

export default function LoginScreen() {
  const { signIn, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const themeColors = colors[resolvedTheme];
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
    // TODO: Implement Google OAuth
    Alert.alert('Thông báo', 'Đăng nhập Google đang được phát triển');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: themeColors.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoBox, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.logoText}>Arex</Text>
          </View>
          <Text style={[styles.logoSubtitle, { color: themeColors.textMuted }]}>Cộng đồng Free Fire Việt Nam</Text>
        </View>

        {/* Form */}
        <View style={[styles.formContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.formTitle, { color: themeColors.text }]}>Đăng nhập</Text>
          <Text style={[styles.formSubtitle, { color: themeColors.textMuted }]}>Nhập thông tin để truy cập tài khoản</Text>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: themeColors.danger }]}>
              <Text style={[styles.errorText, { color: themeColors.danger }]}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="example@email.com"
              placeholderTextColor={themeColors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>Mật khẩu</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="••••••••"
              placeholderTextColor={themeColors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity style={[styles.forgotPassword, { backgroundColor: 'transparent' }]} onPress={() => {}}>
            <Text style={[styles.forgotPasswordText, { color: themeColors.primary }]}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: themeColors.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
          <Text style={[styles.dividerText, { color: themeColors.textMuted }]}>Hoặc</Text>
          <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
        </View>

        {/* Social Login */}
        <View style={styles.socialContainer}>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]} onPress={handleGoogleSignIn}>
            <View style={styles.socialIcon}>
              <Text style={{ fontSize: 20 }}>G</Text>
            </View>
            <Text style={[styles.socialBtnText, { color: themeColors.text }]}>Tiếp tục với Google</Text>
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={[styles.registerText, { color: themeColors.textMuted }]}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.registerLink, { color: themeColors.primary }]}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#F7931A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  logoText: { fontSize: 28, fontWeight: '900', color: '#fff', fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' },
  logoSubtitle: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  formContainer: { padding: 24, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  formTitle: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  formSubtitle: { fontSize: 14, marginBottom: 24 },
  errorBox: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  errorText: { fontSize: 13, fontWeight: '500' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  forgotPassword: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 20 },
  forgotPasswordText: { fontSize: 13, fontWeight: '600' },
  loginBtn: { paddingVertical: 16, borderRadius: 10, alignItems: 'center', shadowColor: '#F7931A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: '500' },
  socialContainer: { marginBottom: 24 },
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 14, borderRadius: 10, borderWidth: 1 },
  socialIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  socialBtnText: { fontSize: 15, fontWeight: '600' },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  registerText: { fontSize: 14 },
  registerLink: { fontSize: 14, fontWeight: '700' },
});

import { useState } from 'react';