import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ExternalLink, Lock, SearchX } from "lucide-react";
import { Card, Chip, EmptyState, SearchInput, SectionTitle } from "@/components/ui";
import { useAuth } from "@/auth/auth-context";
import { ROLE_LABEL, ROLE_LEVEL } from "@/types";
import { useBundleUpdate } from "@/lib/queries";
import { haptic, openExternal, platform } from "@/lib/native";
import { env } from "@/env";
import { GROUP_ORDER } from "@/admin/config";
import { ADMIN_ENTRIES, type AdminEntry } from "@/admin/registry";

/**
 * Danh bạ quản trị — mọi thứ bảng quản trị web làm được, gom vào một chỗ tìm được.
 *
 * Danh sách sinh từ admin/registry.tsx nên thêm mục mới không phải sửa file này.
 * Mục nào vượt quyền vẫn hiện (để biết là có) nhưng bấm không vào được.
 */

/** Bỏ dấu để gõ "doi tac" cũng ra "Đối tác". */
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

export function SystemScreen() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  // Chấm "có bản mới" trên mục Cập nhật; lỗi mạng thì coi như không có bản nào.
  const hasUpdate = Boolean(useBundleUpdate().data);

  const level = ROLE_LEVEL[profile?.role ?? "user"] ?? 0;

  const groups = useMemo(() => {
    const needle = normalize(search.trim());
    const matched = ADMIN_ENTRIES.filter((entry) =>
      needle
        ? normalize(`${entry.title} ${entry.description} ${entry.keywords ?? ""}`).includes(needle)
        : true,
    );
    return GROUP_ORDER.map((group) => ({
      group,
      entries: matched.filter((entry) => entry.group === group),
    })).filter((section) => section.entries.length > 0);
  }, [search]);

  return (
    <div className="space-y-6">
      <SearchInput value={search} onChange={setSearch} placeholder="Tìm mục quản trị…" />

      {groups.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Không tìm thấy mục nào"
          description="Thử từ khoá khác, ví dụ “đối tác”, “giấy phép”, “chặn IP”."
        />
      ) : (
        groups.map((section) => (
          <section key={section.group}>
            <SectionTitle>{section.group}</SectionTitle>
            <Card className="divide-y divide-ink-800 p-0">
              {section.entries.map((entry) => (
                <Row
                  key={entry.id}
                  entry={entry}
                  locked={level < (ROLE_LEVEL[entry.minRole] ?? 0)}
                  badge={
                    entry.id === "cap-nhat" && hasUpdate ? (
                      <Chip tone="info">Có bản mới</Chip>
                    ) : undefined
                  }
                  onOpen={() => navigate(entry.path)}
                />
              ))}
            </Card>
          </section>
        ))
      )}

      {!search && (
        <>
          <section>
            <SectionTitle>Mở trên web</SectionTitle>
            <Card className="divide-y divide-ink-800 p-0">
              <LinkRow
                label="Trang quản trị web"
                description="Những mục cần bảng rộng: phân quyền, wiki, bảng giải"
                onClick={() => void openExternal(`${env.apiBaseUrl}/admin`)}
              />
              <LinkRow
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
        </>
      )}
    </div>
  );
}

function Row({
  entry,
  locked,
  badge,
  onOpen,
}: {
  entry: AdminEntry;
  locked: boolean;
  badge?: React.ReactNode;
  onOpen: () => void;
}) {
  const Icon = entry.icon;
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => {
        haptic("light");
        onOpen();
      }}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-ink-800 disabled:opacity-45"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink-800 text-mist-300">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[14px] font-medium">
          <span className="truncate">{entry.title}</span>
          {locked && (
            <Chip tone="neutral">
              <Lock className="size-2.5" />
              {ROLE_LABEL[entry.minRole]}
            </Chip>
          )}
          {badge}
        </span>
        <span className="block truncate text-[12px] text-mist-500">{entry.description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-mist-500" />
    </button>
  );
}

function LinkRow({
  label,
  description,
  onClick,
}: {
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-ink-800"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink-800 text-mist-300">
        <ExternalLink className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium">{label}</span>
        {description && <span className="block truncate text-[12px] text-mist-500">{description}</span>}
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
