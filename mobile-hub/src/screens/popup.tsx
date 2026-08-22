import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Button, Card, ErrorState, Field, Input, Skeleton, Switch, Textarea } from "@/components/ui";
import { ImagePicker } from "@/components/image-picker";
import { SubHeader } from "@/components/sub-header";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";

/** Popup chào mừng hiện trên trang chủ web. */

type Popup = {
  enabled: boolean;
  title: string;
  content: string;
  image_url: string;
  link_url: string;
};

const EMPTY: Popup = { enabled: false, title: "", content: "", image_url: "", link_url: "" };

export function PopupScreen() {
  const toast = useToast();
  const [form, setForm] = useState<Popup>(EMPTY);
  const [dirty, setDirty] = useState(false);

  const query = useQuery({ queryKey: ["popup"], queryFn: () => api<Popup>("/api/admin/popup") });

  useEffect(() => {
    if (query.data && !dirty) setForm({ ...EMPTY, ...query.data });
  }, [query.data, dirty]);

  const save = useMutation({
    mutationFn: () => api("/api/admin/popup", { method: "PATCH", body: form }),
    onSuccess: () => {
      setDirty(false);
      void query.refetch();
      toast.success("Đã lưu popup.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function set<K extends keyof Popup>(key: K, value: Popup[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  if (query.isLoading) return <Skeleton className="h-64" />;
  if (query.isError)
    return <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-4">
      <SubHeader title="Popup trang chủ" description="Thông báo bật lên khi khách vào web" />

      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium">Bật popup</p>
          <p className="text-[12px] text-mist-500">Tắt là khách không thấy gì cả.</p>
        </div>
        <Switch checked={form.enabled} onChange={(value) => set("enabled", value)} label="Bật popup" />
      </Card>

      <div className="space-y-3.5">
        <Field label="Tiêu đề">
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Nội dung" hint="Cho phép HTML rút gọn.">
          <Textarea rows={6} value={form.content} onChange={(e) => set("content", e.target.value)} />
        </Field>
        <ImagePicker
          value={form.image_url}
          onChange={(url) => set("image_url", url)}
          bucket="events"
          label="Ảnh popup"
        />
        <Field label="Link khi bấm vào" hint="Bỏ trống nếu popup chỉ để đọc.">
          <Input
            value={form.link_url}
            onChange={(e) => set("link_url", e.target.value)}
            placeholder="https://"
          />
        </Field>
      </div>

      <Button block icon={Save} loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
        Lưu popup
      </Button>
    </div>
  );
}
