import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button, Card, Field, Input, SectionTitle, Skeleton, Textarea } from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { ErrorState } from "@/components/ui";
import { errorMessage, useToast } from "@/components/toast";
import { useSaveSettings, useSettings } from "@/lib/queries";
import { hapticResult } from "@/lib/native";

/**
 * Cài đặt site — tập con hợp với điện thoại.
 *
 * Hệ thống có hơn 150 khoá (nền trang chủ, ô quảng cáo, SMTP, webhook, khoá
 * API…). Bê hết lên đây thì vừa không ai cuộn nổi, vừa dễ bấm nhầm thứ làm sập
 * trang. Chỉ giữ những khoá thật sự cần sửa gấp lúc đang đi đường; phần còn lại
 * để trang /admin trên web.
 *
 * Khoá bí mật (SMTP, token, khoá API) CỐ Ý không có ở đây: server trả về mặt nạ
 * chứ không trả giá trị thật, sửa mù trên điện thoại rất dễ hỏng cấu hình.
 */

type FieldSpec = {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
  placeholder?: string;
};

const GROUPS: { title: string; fields: FieldSpec[] }[] = [
  {
    title: "Thương hiệu",
    fields: [
      { key: "branding.site_name", label: "Tên site" },
      { key: "site.description", label: "Mô tả ngắn", multiline: true },
    ],
  },
  {
    title: "SEO mặc định",
    fields: [
      { key: "seo.default_title", label: "Tiêu đề mặc định" },
      {
        key: "seo.default_description",
        label: "Mô tả mặc định",
        multiline: true,
        hint: "Google thường cắt quanh 160 ký tự.",
      },
    ],
  },
  {
    title: "Mạng xã hội",
    fields: [
      { key: "social.facebook_url", label: "Facebook", placeholder: "https://facebook.com/…" },
      { key: "social.youtube_url", label: "YouTube", placeholder: "https://youtube.com/@…" },
      { key: "social.tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/@…" },
      { key: "social.discord_url", label: "Discord", placeholder: "https://discord.gg/…" },
      { key: "social.zalo_url", label: "Zalo", placeholder: "https://zalo.me/…" },
      { key: "social.email", label: "Email liên hệ" },
      { key: "social.phone", label: "Số điện thoại" },
    ],
  },
  {
    title: "Số liệu cộng đồng",
    fields: [
      { key: "community.facebook_members", label: "Thành viên Facebook" },
      { key: "community.youtube_subscribers", label: "Người đăng ký YouTube" },
      { key: "community.tiktok_followers", label: "Người theo dõi TikTok" },
      { key: "community.zalo_members", label: "Thành viên Zalo" },
    ],
  },
];

const EDITABLE_KEYS = GROUPS.flatMap((group) => group.fields.map((field) => field.key));

export function SettingsScreen() {
  const toast = useToast();
  const settings = useSettings();
  const save = useSaveSettings();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const saved = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of settings.data ?? []) {
      if (EDITABLE_KEYS.includes(item.key)) map[item.key] = item.value ?? "";
    }
    return map;
  }, [settings.data]);

  const changes = useMemo(() => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(draft)) {
      if (value !== (saved[key] ?? "")) next[key] = value;
    }
    return next;
  }, [draft, saved]);

  const dirtyCount = Object.keys(changes).length;

  async function submit() {
    try {
      await save.mutateAsync(changes);
      setDraft({});
      hapticResult("success");
      toast.success(`Đã lưu ${dirtyCount} thay đổi.`);
    } catch (error) {
      hapticResult("error");
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="space-y-5">
      <SubHeader
        title="Cài đặt site"
        description="Những mục hay phải sửa gấp — phần còn lại làm trên web"
      />

      {settings.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : settings.isError ? (
        <ErrorState message={errorMessage(settings.error)} onRetry={() => void settings.refetch()} />
      ) : (
        <>
          {GROUPS.map((group) => (
            <section key={group.title}>
              <SectionTitle>{group.title}</SectionTitle>
              <Card className="space-y-3.5">
                {group.fields.map((field) => {
                  const value = draft[field.key] ?? saved[field.key] ?? "";
                  const onChange = (next: string) =>
                    setDraft((prev) => ({ ...prev, [field.key]: next }));

                  return (
                    <Field key={field.key} label={field.label} hint={field.hint}>
                      {field.multiline ? (
                        <Textarea
                          value={value}
                          rows={3}
                          placeholder={field.placeholder}
                          onChange={(e) => onChange(e.target.value)}
                        />
                      ) : (
                        <Input
                          value={value}
                          placeholder={field.placeholder}
                          autoCapitalize="none"
                          autoCorrect="off"
                          onChange={(e) => onChange(e.target.value)}
                        />
                      )}
                    </Field>
                  );
                })}
              </Card>
            </section>
          ))}

          {/* Thanh lưu bám đáy: form dài, cuộn xuống cuối mới thấy nút thì phiền. */}
          {dirtyCount > 0 && (
            <div className="safe-bottom fixed inset-x-0 bottom-16 z-30 px-4">
              <div className="mx-auto max-w-2xl">
                <Button block icon={Save} loading={save.isPending} onClick={() => void submit()}>
                  Lưu {dirtyCount} thay đổi
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
