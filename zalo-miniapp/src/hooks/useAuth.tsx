import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getAccessToken } from "zmp-sdk/apis";
import { supabase } from "../lib/supabase";
import { fetchMyProfile } from "../api";
import { API_BASE } from "../config";
import type { MyProfile } from "../types";

type AuthContextValue = {
  session: Session | null;
  profile: MyProfile | null;
  loading: boolean;
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithZalo: () => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Chuyển lỗi Supabase sang tiếng Việt cho thân thiện.
function viError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Email hoặc mật khẩu không đúng.";
  if (m.includes("email not confirmed")) return "Email chưa được xác minh.";
  if (m.includes("rate limit") || m.includes("too many")) return "Thử lại sau ít phút.";
  return message || "Có lỗi xảy ra. Vui lòng thử lại.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const p = await fetchMyProfile().catch(() => null);
    setProfile(p);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) void loadProfile();
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      if (next) void loadProfile();
      else setProfile(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(viError(error.message));
    await loadProfile();
  }, [loadProfile]);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      // Tạo tài khoản qua endpoint site để đồng bộ hồ sơ (users row, thành tích…),
      // giống hệt đăng ký trên web. Email được auto-confirm nên đăng nhập được ngay.
      const res = await fetch(`${API_BASE}/api/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          display_name: displayName?.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Đăng ký thất bại.");
      // Đăng nhập ngay sau khi đăng ký.
      await signIn(email, password);
    },
    [signIn],
  );

  // Đăng nhập 1 chạm bằng Zalo: lấy access token trong app Zalo → đổi lấy OTP ở
  // server → verifyOtp để có session Supabase (dùng chung Bearer với web).
  const signInWithZalo = useCallback(async () => {
    let accessToken: string;
    try {
      accessToken = await getAccessToken();
    } catch {
      throw new Error("Chỉ đăng nhập Zalo được khi mở trong ứng dụng Zalo.");
    }
    if (!accessToken) throw new Error("Không lấy được thông tin Zalo.");

    // Gộp tài khoản theo SĐT cần Zalo OA (tài khoản doanh nghiệp) — chưa có nên
    // không xin SĐT ở đây, đăng nhập gọn 1 chạm. Khi có OA: gọi getPhoneNumber()
    // và gửi kèm phoneToken (backend đã sẵn sàng nhận).
    const res = await fetch(`${API_BASE}/api/zalo/miniapp/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      email?: string;
      otp?: string;
      error?: string;
    };
    if (!res.ok || !data.email || !data.otp) {
      throw new Error(data.error || "Đăng nhập Zalo thất bại.");
    }

    // Thử cả 2 kiểu OTP để tương thích các phiên bản Supabase.
    let ok = false;
    for (const type of ["magiclink", "email"] as const) {
      const { error } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.otp,
        type,
      });
      if (!error) {
        ok = true;
        break;
      }
    }
    if (!ok) throw new Error("Không thiết lập được phiên đăng nhập.");
    await loadProfile();
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signedIn: Boolean(session),
        signIn,
        signUp,
        signInWithZalo,
        signOut,
        reloadProfile: loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return ctx;
}
