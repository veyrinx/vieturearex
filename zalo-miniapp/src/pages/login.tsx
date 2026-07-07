import React, { useState } from "react";
import { Page, Header, Box, Text, Input, Button, Icon, useNavigate, useSnackbar } from "zmp-ui";
import { useAuth } from "../hooks/useAuth";

type Mode = "login" | "register";

export default function LoginPage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { signIn, signUp, signInWithZalo } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [zaloLoading, setZaloLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginZalo = async () => {
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
    setError(null);
    if (!email.trim() || !password) {
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") await signIn(email, password);
      else await signUp(email, password, displayName);
      snackbar.openSnackbar({ text: "Đăng nhập thành công!", type: "success" });
      navigate("/account", { animate: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page className="page">
      <Header title={mode === "login" ? "Đăng nhập" : "Đăng ký"} />

      <Box className="auth-card" flex flexDirection="column">
        <Text.Title className="auth-title">Arex Free Fire</Text.Title>
        <Text size="xSmall" className="muted" style={{ marginBottom: 16 }}>
          {mode === "login"
            ? "Đăng nhập bằng tài khoản Arex để dùng đầy đủ trong mini app."
            : "Tạo tài khoản mới — dùng ngay không cần xác minh email."}
        </Text>

        {/* Đăng nhập 1 chạm bằng Zalo */}
        <Button
          fullWidth
          loading={zaloLoading}
          onClick={loginZalo}
          className="btn-zalo"
          prefixIcon={<Icon icon="zi-user-circle" />}
        >
          Đăng nhập bằng Zalo
        </Button>

        <Box className="divider" flex alignItems="center">
          <Box className="divider-line" />
          <Text size="xxSmall" className="muted" style={{ margin: "0 10px" }}>hoặc dùng email</Text>
          <Box className="divider-line" />
        </Box>

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
          />
        </Box>

        <Box mb={3}>
          <Input.Password
            label="Mật khẩu"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Box>

        {error && (
          <Text size="xSmall" style={{ color: "#ef4444", marginBottom: 12 }}>
            {error}
          </Text>
        )}

        <Button fullWidth loading={loading} onClick={submit}>
          {mode === "login" ? "Đăng nhập" : "Đăng ký"}
        </Button>

        <Box mt={4} flex justifyContent="center">
          <Text size="xSmall" className="muted">
            {mode === "login" ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
          </Text>
          <Text
            size="xSmall"
            style={{ color: "var(--accent)", fontWeight: 600, marginLeft: 4 }}
            onClick={() => {
              setError(null);
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
          </Text>
        </Box>
      </Box>
    </Page>
  );
}
