import { useState } from "react";
import { Megaphone, Send } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
  Switch,
  Textarea,
  type ChipTone,
} from "@/components/ui";
import { SubHeader } from "@/components/sub-header";
import { errorMessage, useToast } from "@/components/toast";
import { useAnnouncements, useCreateAnnouncement } from "@/lib/queries";
import { formatDateTime, fromLocalInputValue, timeAgo } from "@/lib/format";
import type { Announcement } from "@/types";

const TYPE_LABEL: Record<Announcement["type"], string> = {
  info: "Thông tin",
  success: "Tin vui",
  warning: "Cảnh báo",
  error: "Khẩn cấp",
};

const TYPE_TONE: Record<Announcement["type"], ChipTone> = {
  info: "info",
  success: "ok",
  warning: "warn",
  error: "danger",
};

export function BroadcastScreen() {
  const toast = useToast();
  const announcements = useAnnouncements();
  const create = useCreateAnnouncement();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<Announcement["type"]>("info");
  const [isActive, setIsActive] = useState(true);
  const [endsAt, setEndsAt] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Nhập tiêu đề.";
    if (title.length > 120) next.title = "Tiêu đề tối đa 120 ký tự.";
    if (!message.trim()) next.message = "Nhập nội dung.";
    if (message.length > 500) next.message = "Nội dung tối đa 500 ký tự.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await create.mutateAsync({
        title: title.trim(),
        message: message.trim(),
        type,
        is_active: isActive,
        ends_at: endsAt ? fromLocalInputValue(endsAt) : null,
      });
      toast.success("Đã đăng thông báo.");
      setTitle("");
      setMessage("");
      setEndsAt("");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="space-y-5">
      <SubHeader
        title="Thông báo hệ thống"
        description="Banner hiển thị cho toàn bộ người dùng trên website"
      />

      <Card className="space-y-4">
        <Field label="Tiêu đề" required error={errors.title}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Bảo trì hệ thống 22:00 hôm nay"
            maxLength={120}
          />
        </Field>

        <Field label="Nội dung" required error={errors.message} hint={`${message.length}/500`}>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Mô tả ngắn gọn để người dùng nắm được ngay."
          />
        </Field>

        <Field label="Mức độ">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as Announcement["type"])}
          >
            {(Object.keys(TYPE_LABEL) as Announcement["type"][]).map((value) => (
              <option key={value} value={value}>
                {TYPE_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tự ẩn lúc" hint="Bỏ trống nếu muốn hiển thị đến khi tắt thủ công.">
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-700 bg-ink-900 px-3.5 py-3">
          <div>
            <p className="text-[13.5px] font-medium">Hiển thị ngay</p>
            <p className="text-[11.5px] text-mist-500">Tắt để lưu trước, bật sau trên web.</p>
          </div>
          <Switch checked={isActive} onChange={setIsActive} label="Hiển thị ngay" />
        </div>

        <Button block icon={Send} loading={create.isPending} onClick={() => void submit()}>
          Đăng thông báo
        </Button>
      </Card>

      <section>
        <h3 className="mb-2.5 px-0.5 text-[13px] font-semibold tracking-wide text-mist-500 uppercase">
          Đã đăng gần đây
        </h3>

        {announcements.isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : announcements.isError ? (
          <ErrorState
            message={errorMessage(announcements.error)}
            onRetry={() => void announcements.refetch()}
          />
        ) : (announcements.data?.length ?? 0) === 0 ? (
          <EmptyState icon={Megaphone} title="Chưa có thông báo nào" />
        ) : (
          <div className="space-y-3">
            {announcements.data?.slice(0, 20).map((item) => (
              <Card key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Chip tone={TYPE_TONE[item.type] ?? "neutral"}>
                      {TYPE_LABEL[item.type] ?? item.type}
                    </Chip>
                    <Chip tone={item.is_active ? "ok" : "neutral"}>
                      {item.is_active ? "Đang hiện" : "Đã tắt"}
                    </Chip>
                  </div>
                  <span className="text-[11px] text-mist-500">{timeAgo(item.created_at)}</span>
                </div>
                <p className="text-[14px] font-medium">{item.title}</p>
                <p className="text-[13px] leading-relaxed text-mist-300">{item.message}</p>
                {item.ends_at && (
                  <p className="text-[11.5px] text-mist-500">
                    Tự ẩn lúc {formatDateTime(item.ends_at)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
