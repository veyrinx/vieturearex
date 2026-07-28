import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ADMIN_ROLES, type UserRole } from "@/types";

export type HubProfile = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl: string | null;
  isBanned: boolean;
};

type AuthState = {
  /** Chưa biết trạng thái (đang đọc phiên đã lưu) → hiện splash. */
  loading: boolean;
  session: Session | null;
  profile: HubProfile | null;
  /** Đăng nhập được nhưng vai trò không đủ quyền vào Hub. */
  forbidden: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Thông báo lỗi Supabase → tiếng Việt. */
function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Email hoặc mật khẩu không đúng.";
  if (lower.includes("email not confirmed")) return "Email chưa được xác nhận.";
  if (lower.includes("too many requests") || lower.includes("rate limit"))
    return "Thử quá nhiều lần, đợi một lát rồi đăng nhập lại.";
  if (lower.includes("failed to fetch") || lower.includes("network"))
    return "Không kết nối được máy chủ — kiểm tra mạng.";
  return message;
}

async function loadProfile(session: Session): Promise<HubProfile> {
  const user = session.user;
  const fallbackRole = (user.app_metadata?.role as UserRole | undefined) ?? "user";
  const fallbackName = user.email?.split("@")[0] ?? "Admin";

  // RLS cho phép mỗi người đọc hồ sơ của chính mình.
  const { data } = await supabase
    .from("users")
    .select("id, email, display_name, role, avatar_url, is_banned")
    .eq("id", user.id)
    .maybeSingle();

  const row = data as {
    id: string;
    email: string | null;
    display_name: string | null;
    role: UserRole | null;
    avatar_url: string | null;
    is_banned: boolean | null;
  } | null;

  return {
    id: user.id,
    email: row?.email ?? user.email ?? "",
    displayName: row?.display_name?.trim() || fallbackName,
    role: row?.role ?? fallbackRole,
    avatarUrl: row?.avatar_url ?? null,
    isBanned: Boolean(row?.is_banned),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<HubProfile | null>(null);
  // Giữ id phiên đang tải hồ sơ để bỏ qua kết quả về trễ của phiên cũ.
  const activeUserId = useRef<string | null>(null);

  const applySession = useCallback(async (next: Session | null) => {
    setSession(next);
    activeUserId.current = next?.user.id ?? null;

    if (!next) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const loaded = await loadProfile(next);
      if (activeUserId.current === next.user.id) setProfile(loaded);
    } catch {
      // Không đọc được bảng users (mất mạng/RLS) — vẫn cho vào bằng app_metadata.
      if (activeUserId.current === next.user.id) {
        setProfile({
          id: next.user.id,
          email: next.user.email ?? "",
          displayName: next.user.email?.split("@")[0] ?? "Admin",
          role: (next.user.app_metadata?.role as UserRole | undefined) ?? "user",
          avatarUrl: null,
          isBanned: false,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) void applySession(data.session);
      })
      .catch(() => mounted && setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      // TOKEN_REFRESHED chỉ đổi token, hồ sơ không đổi → khỏi tải lại.
      if (event === "TOKEN_REFRESHED") {
        setSession(next);
        return;
      }
      void applySession(next);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(friendlyAuthError(error.message));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => null);
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const loaded = await loadProfile(session).catch(() => null);
    if (loaded) setProfile(loaded);
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      profile,
      forbidden: Boolean(
        session && profile && (profile.isBanned || !ADMIN_ROLES.includes(profile.role)),
      ),
      signIn,
      signOut,
      refreshProfile,
    }),
    [loading, session, profile, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return ctx;
}

/** Người đang đăng nhập có bậc quyền >= mức yêu cầu không. */
export function useHasRole(minimum: UserRole) {
  const { profile } = useAuth();
  const levels: Record<string, number> = {
    super_admin: 200,
    it: 150,
    admin: 100,
    manager: 60,
    support: 40,
    team_member: 30,
    user: 20,
  };
  return (levels[profile?.role ?? "user"] ?? 0) >= (levels[minimum] ?? 0);
}
