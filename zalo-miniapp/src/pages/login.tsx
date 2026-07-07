import React, { useState } from "react";
import { Page, Box, Text, Input, Button, Icon, useNavigate, useSnackbar } from "zmp-ui";
import { useAuth } from "../hooks/useAuth";

type Mode = "login" | "register";

const EMAIL_KEY = "arex.login.email";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Đọc/lưu email đã dùng lần trước (bọc try/catch phòng webview chặn storage).
function readSavedEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}
function saveEmail(email: string) {
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* bỏ qua nếu storage không khả dụng */
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { signIn, signUp, signInWithZalo } = useAuth();

  const savedEmail = readSavedEmail();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [zaloLoading, setZaloLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Nhấn mạnh đăng nhập Zalo 1 chạm; email gập lại (mở sẵn nếu đã từng dùng).
  const [showEmail, setShowEmail] = useState(Boolean(savedEmail));

  const busy = loading || zaloLoading;

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setError(null);
    setMode(next);
  };

  const loginZalo = async () => {
    if (busy) return;
    setError(null);
    setZaloLoading(true);
    try {
      await signInWithZalo();
      snackbar.openSnackbar({ text: "Đăng nhập thành công!", type: "success" });
      navigate("/account", { animate: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng nhập Zalo thất bại.");
    } finally {
      setZaloLoading(false);
    }
  };

  const submit = async () => {
    if (busy) return;
    setError(null);
    const mail = email.trim().toLowerCase();
    if (!mail || !password) {
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }
    if (!EMAIL_RE.test(mail)) {
      setError("Email không hợp lệ.");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") await signIn(mail, password);
      else await signUp(mail, password, displayName);
      saveEmail(mail);
      snackbar.openSnackbar({ text: "Đăng nhập thành công!", type: "success" });
      navigate("/account", { animate: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page className="page login-page">
      {/* Hero gradient — đồng bộ bản sắc với trang chủ */}
      <Box className="login-hero" flex flexDirection="column" alignItems="center">
        <Box className="login-back" onClick={() => navigate(-1)}>
          <Icon icon="zi-chevron-left" style={{ color: "#fff" }} />
        </Box>
        <Box className="login-logo">A</Box>
        <Text className="login-brand">AREX · FREE FIRE</Text>
        <Text className="login-sub">Cộng đồng game thủ Free Fire Việt</Text>
      </Box>

      <Box className="auth-card" flex flexDirection="column">
        {/* Lối chính: đăng nhập 1 chạm bằng Zalo */}
        <Button
          fullWidth
          loading={zaloLoading}
          disabled={busy}
          onClick={loginZalo}
          className="btn-zalo"
          prefixIcon={<Icon icon="zi-user-circle" />}
        >
          Đăng nhập bằng Zalo
        </Button>
        <Text size="xxSmall" className="muted" style={{ textAlign: "center", marginTop: 6 }}>
          Nhanh nhất khi mở trong ứng dụng Zalo
        </Text>

        {/* Toggle mở form email */}
        <Box
          className="email-toggle"
          flex
          alignItems="center"
          onClick={() => setShowEmail((v) => !v)}
        >
          <Box className="divider-line" />
          <Text size="xxSmall" className="muted" style={{ margin: "0 8px" }}>
            hoặc dùng email
          </Text>
          <Icon icon={showEmail ? "zi-chevron-up" : "zi-chevron-down"} size={16} className="muted" />
          <Box className="divider-line" />
        </Box>

        {showEmail && (
          <>
            {/* Segmented control chuyển Đăng nhập / Đăng ký */}
            <Box className="seg">
              <Box
                className={`seg-item${mode === "login" ? " active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Đăng nhập
              </Box>
              <Box
                className={`seg-item${mode === "register" ? " active" : ""}`}
                onClick={() => switchMode("register")}
              >
                Đăng ký
              </Box>
            </Box>

            <Text size="xSmall" className="muted auth-lead">
              {mode === "login"
                ? "Đăng nhập bằng tài khoản Arex để dùng đầy đủ trong mini app."
                : "Tạo tài khoản mới — dùng ngay không cần xác minh email."}
            </Text>

            {mode === "register" && (
              <Box mb={3}>
                <Input
                  label="Tên hiển thị"
                  placeholder="Tên của bạn"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </Box>
            )}

            <Box mb={3}>
              <Input
                label="Email"
                type="text"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onPressEnter={submit}
              />
            </Box>

            <Box mb={3}>
              <Input.Password
                label="Mật khẩu"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPressEnter={submit}
              />
            </Box>

            {error && (
              <Box className="auth-error" flex alignItems="center">
                <Icon icon="zi-warning" size={16} />
                <Text size="xSmall" style={{ marginLeft: 6 }}>{error}</Text>
              </Box>
            )}

            <Button fullWidth loading={loading} disabled={busy} onClick={submit}>
              {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
            </Button>
          </>
        )}

        {/* Lỗi từ đăng nhập Zalo khi form email đang đóng */}
        {!showEmail && error && (
          <Box className="auth-error" flex alignItems="center" style={{ marginTop: 12 }}>
            <Icon icon="zi-warning" size={16} />
            <Text size="xSmall" style={{ marginLeft: 6 }}>{error}</Text>
          </Box>
        )}

        <Text size="xxSmall" className="muted auth-terms">
          Bằng việc tiếp tục, bạn đồng ý với Điều khoản & Chính sách của Arex.
        </Text>
      </Box>
    </Page>
  );
}
