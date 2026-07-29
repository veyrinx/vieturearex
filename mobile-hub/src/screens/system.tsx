import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  CloudDownload,
  ExternalLink,
  History,
  Lock,
  Megaphone,
  SlidersHorizontal,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, Chip, SectionTitle } from "@/components/ui";
import { useAuth, useHasRole } from "@/auth/auth-context";
import { ROLE_LABEL } from "@/types";
import { useBundleUpdate } from "@/lib/queries";
import { haptic, openExternal, platform } from "@/lib/native";
import { env } from "@/env";

export function SystemScreen() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = useHasRole("admin");
  // Chấm "có bản mới" trên menu; lỗi mạng thì coi như không có bản nào.
  const hasUpdate = Boolean(useBundleUpdate().data);

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>Quản trị</SectionTitle>
        <Card className="divide-y divide-ink-800 p-0">
          <Row
            icon={Users}
            label="Người dùng"
            description="Khoá tài khoản, đổi vai trò, cấp tích xanh"
            locked={!isAdmin}
            onClick={() => navigate("/he-thong/nguoi-dung")}
          />
          <Row
            icon={Megaphone}
            label="Thông báo hệ thống"
            description="Đăng banner thông báo hiện trên toàn site"
            locked={!isAdmin}
            onClick={() => navigate("/he-thong/thong-bao")}
          />
          <Row
            icon={Smartphone}
            label="Bản phát hành app"
            description="File cài đặt Android / iOS"
            locked={!isAdmin}
            onClick={() => navigate("/he-thong/ban-phat-hanh")}
          />
          <Row
            icon={SlidersHorizontal}
            label="Cài đặt site"
            description="Tên site, SEO, mạng xã hội, số liệu cộng đồng"
            locked={!isAdmin}
            onClick={() => navigate("/he-thong/cai-dat")}
          />
          <Row
            icon={CloudDownload}
            label="Cập nhật app"
            description="Tải giao diện mới, không phải cài lại app"
            badge={hasUpdate ? <Chip tone="info">Có bản mới</Chip> : undefined}
            onClick={() => navigate("/he-thong/cap-nhat")}
          />
          <Row
            icon={History}
            label="Nhật ký hoạt động"
            description="Toàn bộ thao tác của quản trị viên"
            onClick={() => navigate("/he-thong/nhat-ky")}
          />
        </Card>
      </section>

      <section>
        <SectionTitle>Mở trên web</SectionTitle>
        <Card className="divide-y divide-ink-800 p-0">
          <Row
            icon={ExternalLink}
            label="Trang quản trị đầy đủ"
            description="Cài đặt, phân quyền, SQL, wiki…"
            onClick={() => void openExternal(`${env.apiBaseUrl}/admin`)}
          />
          <Row
            icon={ExternalLink}
            label="Website Arex Network"
            onClick={() => void openExternal(env.apiBaseUrl)}
          />
        </Card>
      </section>

      <section>
        <SectionTitle>Thông tin</SectionTitle>
        <Card className="space-y-2 text-[13px]">
          <InfoRow label="Tài khoản" value={profile?.email ?? "—"} />
          <InfoRow label="Vai trò" value={ROLE_LABEL[profile?.role ?? "user"] ?? "—"} />
          <InfoRow label="Phiên bản" value={`Arex Hub ${env.appVersion}`} />
          <InfoRow label="Nền tảng" value={platform === "web" ? "Trình duyệt" : platform} />
          <InfoRow label="Máy chủ" value={env.apiBaseUrl.replace(/^https?:\/\//, "")} />
        </Card>
      </section>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  description,
  locked,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  locked?: boolean;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-ink-800 disabled:opacity-50"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink-800 text-mist-300">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[14px] font-medium">
          {label}
          {locked && (
            <Chip tone="neutral">
              <Lock className="size-2.5" />
              Cần Admin
            </Chip>
          )}
          {badge}
        </span>
        {description && <span className="block text-[12px] text-mist-500">{description}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-mist-500" />
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-mist-500">{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  );
}
