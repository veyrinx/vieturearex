import { useMemo, useState } from "react";
import { BadgeCheck, Ban, KeyRound, LogOut, ShieldCheck, Undo2, Users } from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Field,
  SearchInput,
  Segmented,
  Select,
  Sheet,
  Skeleton,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { errorMessage, useToast } from "@/components/toast";
import { useForceSignOut, useResetPassword, useUpdateUser, useUsers } from "@/lib/queries";
import { useAuth } from "@/auth/auth-context";
import { formatDate } from "@/lib/format";
import { ROLE_LABEL, ROLE_LEVEL, type UserItem, type UserRole } from "@/types";

const ASSIGNABLE_ROLES: UserRole[] = ["user", "support", "manager", "admin", "it", "super_admin"];

type Filter = "all" | "staff" | "banned";

export function UsersScreen() {
  const toast = useToast();
  const { profile } = useAuth();
  const users = useUsers();
  const update = useUpdateUser();
  const resetPassword = useResetPassword();
  const forceSignOut = useForceSignOut();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<UserItem | null>(null);
  const [banTarget, setBanTarget] = useState<UserItem | null>(null);

  const myLevel = ROLE_LEVEL[profile?.role ?? "user"] ?? 0;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (users.data ?? []).filter((user) => {
      if (filter === "staff" && (ROLE_LEVEL[user.role] ?? 0) <= ROLE_LEVEL.user) return false;
      if (filter === "banned" && !user.is_banned) return false;
      if (!needle) return true;
      return `${user.email} ${user.display_name ?? ""}`.toLowerCase().includes(needle);
    });
  }, [users.data, search, filter]);

  /** Không cho thao tác lên người ngang hoặc trên cấp mình (server cũng chặn). */
  function canManage(user: UserItem) {
    if (user.id === profile?.id) return false;
    return myLevel > (ROLE_LEVEL[user.role] ?? 0);
  }

  async function toggleBan(user: UserItem) {
    try {
      await update.mutateAsync({ id: user.id, is_banned: !user.is_banned });
      toast.success(user.is_banned ? "Đã mở khoá tài khoản." : "Đã khoá tài khoản.");
      setBanTarget(null);
      setSelected(null);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function changeRole(user: UserItem, role: UserRole) {
    try {
      await update.mutateAsync({ id: user.id, role });
      toast.success(`Đã đổi vai trò thành ${ROLE_LABEL[role]}.`);
      setSelected({ ...user, role });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function sendResetLink(user: UserItem) {
    try {
      await resetPassword.mutateAsync(user.id);
      toast.success(`Đã gửi link đặt lại mật khẩu tới ${user.email}.`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function kickSessions(user: UserItem) {
    try {
      await forceSignOut.mutateAsync(user.id);
      toast.success("Đã đăng xuất tài khoản khỏi mọi thiết bị.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function toggleVerified(user: UserItem) {
    try {
      await update.mutateAsync({ id: user.id, is_verified: !user.is_verified });
      toast.success(user.is_verified ? "Đã thu hồi tích xanh." : "Đã cấp tích xanh.");
      setSelected({ ...user, is_verified: !user.is_verified });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      <SubHeader
        title="Người dùng"
        description={users.data ? `${users.data.length} tài khoản` : undefined}
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo email hoặc tên…" />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "staff", label: "Có quyền" },
          { value: "banned", label: "Bị khoá" },
        ]}
      />

      {users.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : users.isError ? (
        <ErrorState message={errorMessage(users.error)} onRetry={() => void users.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Không tìm thấy tài khoản" />
      ) : (
        <Card className="divide-y divide-ink-800 p-0">
          {filtered.slice(0, 200).map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => setSelected(user)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-ink-800"
            >
              <Avatar url={user.avatar_url} name={user.display_name ?? user.email} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[13.5px] font-medium">
                    {user.display_name || user.email.split("@")[0]}
                  </p>
                  {user.is_verified && <BadgeCheck className="size-3.5 shrink-0 text-cyan-glow" />}
                </div>
                <p className="truncate text-[11.5px] text-mist-500">{user.email}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {user.is_banned && <Chip tone="danger">Bị khoá</Chip>}
                {(ROLE_LEVEL[user.role] ?? 0) > ROLE_LEVEL.user && (
                  <Chip tone="info">{ROLE_LABEL[user.role] ?? user.role}</Chip>
                )}
              </div>
            </button>
          ))}
          {filtered.length > 200 && (
            <p className="px-4 py-3 text-center text-[12px] text-mist-500">
              Còn {filtered.length - 200} tài khoản nữa — thu hẹp bằng ô tìm kiếm.
            </p>
          )}
        </Card>
      )}

      <Sheet open={selected !== null} onClose={() => setSelected(null)} title="Quản lý tài khoản">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar
                url={selected.avatar_url}
                name={selected.display_name ?? selected.email}
                size={52}
              />
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {selected.display_name || selected.email.split("@")[0]}
                </p>
                <p className="truncate text-[13px] text-mist-500">{selected.email}</p>
                <p className="mt-0.5 text-[11.5px] text-mist-500">
                  Tham gia {formatDate(selected.created_at)}
                </p>
              </div>
            </div>

            {!canManage(selected) ? (
              <div className="rounded-2xl border border-ink-700 bg-ink-800/60 px-3.5 py-3 text-[12.5px] text-mist-500">
                {selected.id === profile?.id
                  ? "Đây là tài khoản của bạn — không tự đổi quyền được."
                  : "Tài khoản này có cấp bằng hoặc cao hơn bạn nên không thao tác được."}
              </div>
            ) : (
              <>
                <Field label="Vai trò" hint="Quyết định những gì tài khoản làm được.">
                  <Select
                    value={selected.role}
                    disabled={update.isPending}
                    onChange={(e) => void changeRole(selected, e.target.value as UserRole)}
                  >
                    {ASSIGNABLE_ROLES.filter(
                      // Chỉ gán được vai trò thấp hơn cấp của mình.
                      (role) => (ROLE_LEVEL[role] ?? 0) < myLevel || role === selected.role,
                    ).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    block
                    icon={BadgeCheck}
                    loading={update.isPending}
                    onClick={() => void toggleVerified(selected)}
                  >
                    {selected.is_verified ? "Thu hồi tích xanh" : "Cấp tích xanh"}
                  </Button>

                  <Button
                    variant={selected.is_banned ? "secondary" : "danger"}
                    block
                    icon={selected.is_banned ? Undo2 : Ban}
                    onClick={() =>
                      selected.is_banned ? void toggleBan(selected) : setBanTarget(selected)
                    }
                  >
                    {selected.is_banned ? "Mở khoá tài khoản" : "Khoá tài khoản"}
                  </Button>

                  <Button
                    variant="secondary"
                    block
                    icon={KeyRound}
                    loading={resetPassword.isPending}
                    onClick={() => void sendResetLink(selected)}
                  >
                    Gửi link đặt lại mật khẩu
                  </Button>

                  <Button
                    variant="secondary"
                    block
                    icon={LogOut}
                    loading={forceSignOut.isPending}
                    onClick={() => void kickSessions(selected)}
                  >
                    Đăng xuất khỏi mọi thiết bị
                  </Button>
                </div>

                <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-mist-500">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                  Đổi email, xoá tài khoản và phân quyền chi tiết chỉ làm được trên trang quản trị
                  web.
                </p>
              </>
            )}
          </div>
        )}
      </Sheet>

      <ConfirmSheet
        open={banTarget !== null}
        title="Khoá tài khoản?"
        message={`${banTarget?.email ?? ""} sẽ không đăng nhập được cho tới khi bạn mở khoá.`}
        confirmLabel="Khoá"
        destructive
        loading={update.isPending}
        onConfirm={() => banTarget && void toggleBan(banTarget)}
        onCancel={() => setBanTarget(null)}
      />
    </div>
  );
}
