'use client';

import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';

const colors = {
  light: { background: '#fafafa', card: '#ffffff', border: '#e4e4e7', text: '#0a0a0a', textMuted: '#71717a', primary: '#F7931A', primaryLight: 'rgba(247, 147, 26, 0.15)', danger: '#ef4444' },
  dark: { background: '#0a0a0a', card: '#141414', border: '#262626', text: '#fafafa', textMuted: '#a1a1aa', primary: '#F7931A', primaryLight: 'rgba(247, 147, 26, 0.15)', danger: '#ef4444' },
};

export default function RegisterScreen() {
  const { signUp, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const themeColors = colors[resolvedTheme];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !displayName) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setError('');
    const { error: err } = await signUp(email, password, displayName);
    if (err) {
      setError(err.message);
    } else {
      Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <View style={[styles.logoBox, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.logoText}>Arex</Text>
          </View>
          <Text style={[styles.logoSubtitle, { color: themeColors.textMuted }]}>Tạo tài khoản mới</Text>
        </View>

        <View style={[styles.formContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.formTitle, { color: themeColors.text }]}>Đăng ký</Text>
          <Text style={[styles.formSubtitle, { color: themeColors.textMuted }]}>Tham gia cộng đồng Free Fire ngay hôm nay</Text>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: themeColors.danger }]}>
              <Text style={[styles.errorText, { color: themeColors.danger }]}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>Tên hiển thị</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="Tên của bạn"
              placeholderTextColor={themeColors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />
          </View>

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
              placeholder="Ít nhất 6 ký tự"
              placeholderTextColor={themeColors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: themeColors.text }]}>Xác nhận mật khẩu</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="Nhập lại mật khẩu"
              placeholderTextColor={themeColors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="go"
              onSubmitEditing={handleRegister}
            />
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: themeColors.primary }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerBtnText}>{loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
          <Text style={[styles.dividerText, { color: themeColors.textMuted }]}>Hoặc</Text>
          <View style={[styles.dividerLine, { backgroundColor: themeColors.border }]} />
        </View>

        <View style={styles.socialContainer}>
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]} onPress={() => {}}>
            <View style={styles.socialIcon}><Text style={{ fontSize: 20 }}>G</Text></View>
            <Text style={[styles.socialBtnText, { color: themeColors.text }]}>Tiếp tục với Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: themeColors.textMuted }]}>Đã có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={[styles.loginLink, { color: themeColors.primary }]}>Đăng nhập ngay</Text>
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
  registerBtn: { paddingVertical: 16, borderRadius: 10, alignItems: 'center', shadowColor: '#F7931A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  registerBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: '500' },
  socialContainer: { marginBottom: 24 },
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 14, borderRadius: 10, borderWidth: 1 },
  socialIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  socialBtnText: { fontSize: 15, fontWeight: '600' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '700' },
});

import { useState } from 'react';