"use client";

/* eslint-disable @next/next/no-img-element -- xem trước ảnh vừa tải lên */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import type { CraftlandCreator, CraftlandLink, CraftlandMap } from "@/lib/types/craftland";
import { cn } from "@/lib/utils";

export const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

export async function apiCall<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);
  return data;
}

export function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Tải ảnh lên bucket "craftland" qua /api/upload (giới hạn 5MB, chỉ ảnh). */
export function ImageUpload({
  value,
  onChange,
  label,
  aspect = "aspect-video",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label: string;
  aspect?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Chỉ nhận tệp ảnh.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh tối đa 5MB.");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "craftland");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { publicUrl?: string; error?: string };
      if (!res.ok || !data.publicUrl) throw new Error(data.error ?? "Tải ảnh thất bại.");
      onChange(data.publicUrl);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className={cn("relative overflow-hidden rounded-lg border border-dashed border-border bg-muted/40", aspect)}>
        {value ? (
          <>
            <img src={value} alt="" className="size-full object-cover" />
            <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 rounded-md bg-background/90 p-1 shadow" aria-label={`Xoá ${label.toLowerCase()}`}>
              <X className="size-4" />
            </button>
          </>
        ) : (
          <button type="button" onClick={() => ref.current?.click()} disabled={uploading} className="flex size-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            {uploading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ImagePlus className="size-5" aria-hidden />}
            {uploading ? "Đang tải…" : "Chọn ảnh"}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}

export function LinkListEditor({ value, onChange, max = 8 }: { value: CraftlandLink[]; onChange: (v: CraftlandLink[]) => void; max?: number }) {
  return (
    <div className="space-y-2">
      {value.map((l, i) => (
        <div key={i} className="flex gap-2">
          <input className={cn(inputCls, "w-32 shrink-0")} placeholder="Tên (VD: YouTube)" value={l.label} maxLength={40}
            onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input className={inputCls} placeholder="https://…" value={l.url} maxLength={500} type="url"
            onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="shrink-0 rounded-lg px-2 text-muted-foreground hover:text-destructive" aria-label="Xoá liên kết">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      {value.length < max && (
        <button type="button" onClick={() => onChange([...value, { label: "", url: "" }])} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <Plus className="size-4" aria-hidden /> Thêm liên kết
        </button>
      )}
    </div>
  );
}

// ── Hồ sơ creator ─────────────────────────────────────────────

export function ProfileForm({ creator, defaultName }: { creator: CraftlandCreator | null; defaultName: string }) {
  const router = useRouter();
  const verified = creator?.verification_status === "verified";
  const [form, setForm] = useState({
    username: creator?.username ?? "",
    display_name: creator?.display_name ?? defaultName,
    bio: creator?.bio ?? "",
    avatar_url: creator?.avatar_url ?? null,
    cover_url: creator?.cover_url ?? null,
    social_links: creator?.social_links ?? [],
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await apiCall("/api/craftland/studio/profile", "PUT", {
            ...form,
            social_links: form.social_links.filter((l) => l.label.trim() && l.url.trim()),
          });
          toast.success(creator ? "Đã lưu hồ sơ" : "Đã tạo hồ sơ creator");
          router.push(creator ? "/creator/profile" : "/creator");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
        <ImageUpload label="Avatar" value={form.avatar_url} onChange={(v) => set("avatar_url", v)} aspect="aspect-square" />
        <ImageUpload label="Ảnh bìa" value={form.cover_url} onChange={(v) => set("cover_url", v)} aspect="aspect-[4/1]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" required hint={verified ? "Creator đã xác minh không tự đổi username." : "3–24 ký tự a-z, 0-9, _. Dùng trong đường dẫn hồ sơ."}>
          <input className={inputCls} value={form.username} onChange={(e) => set("username", e.target.value.toLowerCase())} required pattern="[a-z0-9_]{3,24}" maxLength={24} disabled={verified} />
        </Field>
        <Field label="Tên hiển thị" required hint={verified ? "Liên hệ đội ngũ để đổi tên sau khi đã xác minh." : undefined}>
          <input className={inputCls} value={form.display_name} onChange={(e) => set("display_name", e.target.value)} required minLength={2} maxLength={60} disabled={verified} />
        </Field>
      </div>
      <Field label="Giới thiệu bản thân">
        <textarea className={inputCls} rows={4} maxLength={1000} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
      </Field>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Liên kết mạng xã hội</span>
        <LinkListEditor value={form.social_links} onChange={(v) => set("social_links", v)} />
      </div>
      <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {creator ? "Lưu hồ sơ" : "Tạo hồ sơ creator"}
      </button>
    </form>
  );
}

// ── Bản đồ ────────────────────────────────────────────────────

type MapFormValue = {
  title: string; summary: string; description: string; category_slug: string; tags: string[];
  map_code: string; platforms: Array<"mobile" | "pc">; cover_url: string | null; gallery: string[];
  video_url: string; how_to_play: string;
};

export function MapForm({
  map,
  categories,
  canPublish,
}: {
  map: CraftlandMap | null;
  categories: Array<{ slug: string; name: string }>;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<MapFormValue>({
    title: map?.title ?? "",
    summary: map?.summary ?? "",
    description: map?.description ?? "",
    category_slug: map?.category_slug ?? categories[0]?.slug ?? "khac",
    tags: map?.tags ?? [],
    map_code: map?.map_code ?? "",
    platforms: map?.platforms ?? [],
    cover_url: map?.cover_url ?? null,
    gallery: map?.gallery ?? [],
    video_url: map?.video_url ?? "",
    how_to_play: map?.how_to_play ?? "",
  });
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const set = <K extends keyof MapFormValue>(k: K, v: MapFormValue[K]) => setForm((f) => ({ ...f, [k]: v }));

  const locked = map && !["draft", "rejected", "pending", "published"].includes(map.status);
  const canSubmit = canPublish && (!map || map.status === "draft" || map.status === "rejected");
  const republishWarning =
    map?.status === "published" && (form.title.trim() !== map.title || (form.map_code.trim() || null) !== map.map_code);

  const payload = () => ({
    ...form,
    map_code: form.map_code.trim() || null,
    video_url: form.video_url.trim() || null,
  });

  const save = async (submit: boolean) => {
    setBusy(submit ? "submit" : "save");
    try {
      let id = map?.id;
      if (!id) {
        const created = await apiCall<{ map: { id: string } }>("/api/craftland/studio/maps", "POST", payload());
        id = created.map.id;
        if (submit) await apiCall(`/api/craftland/studio/maps/${id}`, "PATCH", { action: "submit" });
      } else {
        await apiCall(`/api/craftland/studio/maps/${id}`, "PATCH", { action: submit ? "submit" : "save", fields: payload() });
      }
      toast.success(submit ? "Đã gửi duyệt. Bạn sẽ thấy phản hồi tại đây." : "Đã lưu bản nháp");
      router.push(`/creator/maps/${id}`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t) && form.tags.length < 10) set("tags", [...form.tags, t]);
    setTagInput("");
  };

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save(false); }}>
      <fieldset disabled={!!locked || busy !== null} className="space-y-5">
        <Field label="Tên bản đồ" required>
          <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} required minLength={3} maxLength={120} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mã map" hint="Mã bạn nhận được khi xuất bản bản đồ trong game. Bắt buộc khi gửi duyệt.">
            <input className={cn(inputCls, "font-mono")} value={form.map_code} onChange={(e) => set("map_code", e.target.value)} maxLength={64} pattern="[A-Za-z0-9#_\-]*" />
          </Field>
          <Field label="Thể loại" required>
            <select className={inputCls} value={form.category_slug} onChange={(e) => set("category_slug", e.target.value)}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Mô tả ngắn" hint={`${form.summary.length}/280 — hiển thị trên card và kết quả tìm kiếm.`}>
          <input className={inputCls} value={form.summary} onChange={(e) => set("summary", e.target.value)} maxLength={280} />
        </Field>
        <Field label="Giới thiệu chi tiết">
          <textarea className={inputCls} rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={20000} />
        </Field>
        <Field label="Hướng dẫn trải nghiệm" hint="Cách vào map, luật chơi, số người phù hợp…">
          <textarea className={inputCls} rows={4} value={form.how_to_play} onChange={(e) => set("how_to_play", e.target.value)} maxLength={5000} />
        </Field>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">Tag ({form.tags.length}/10)</span>
          <div className="flex flex-wrap gap-1.5">
            {form.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                #{t}
                <button type="button" onClick={() => set("tags", form.tags.filter((x) => x !== t))} aria-label={`Bỏ tag ${t}`}><X className="size-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={inputCls} value={tagInput} maxLength={30} placeholder="Nhập tag rồi Enter"
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
            <button type="button" onClick={addTag} className="shrink-0 rounded-lg border border-border px-3 text-sm">Thêm</button>
          </div>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Nền tảng tương thích (bạn tự khai báo)</legend>
          <div className="flex gap-4 text-sm">
            {(["mobile", "pc"] as const).map((p) => (
              <label key={p} className="flex items-center gap-2">
                <input type="checkbox" checked={form.platforms.includes(p)}
                  onChange={(e) => set("platforms", e.target.checked ? [...form.platforms, p] : form.platforms.filter((x) => x !== p))} />
                {p === "pc" ? "PC" : "Mobile"}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Chỉ hiển thị công khai sau khi kiểm duyệt viên xác nhận.</p>
        </fieldset>

        <ImageUpload label="Ảnh cover (bắt buộc khi gửi duyệt)" value={form.cover_url} onChange={(v) => set("cover_url", v)} />

        <div className="space-y-1.5">
          <span className="text-sm font-medium">Thư viện ảnh ({form.gallery.length}/12)</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {form.gallery.map((src) => (
              <div key={src} className="relative overflow-hidden rounded-lg border border-border">
                <img src={src} alt="" className="aspect-video w-full object-cover" />
                <button type="button" onClick={() => set("gallery", form.gallery.filter((g) => g !== src))} className="absolute right-1 top-1 rounded bg-background/90 p-0.5" aria-label="Xoá ảnh">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {form.gallery.length < 12 && (
              <ImageUpload label="" value={null} onChange={(v) => v && set("gallery", [...form.gallery, v])} />
            )}
          </div>
        </div>

        <Field label="Video gameplay" hint="Liên kết YouTube, TikTok hoặc Facebook.">
          <input className={inputCls} type="url" value={form.video_url} onChange={(e) => set("video_url", e.target.value)} maxLength={300} placeholder="https://youtube.com/watch?v=…" />
        </Field>
      </fieldset>

      {republishWarning && (
        <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          Bạn đang đổi tên hoặc mã map của bản đồ đã xuất bản. Sau khi lưu, bản đồ sẽ tạm ẩn và chờ duyệt lại.
        </p>
      )}
      {!canPublish && <p className="text-sm text-destructive">Tài khoản đang bị tạm dừng quyền đăng bản đồ — bạn vẫn có thể lưu bản nháp.</p>}

      {!locked && (
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy !== null} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold disabled:opacity-60">
            {busy === "save" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {map?.status === "published" || map?.status === "pending" ? "Lưu thay đổi" : "Lưu bản nháp"}
          </button>
          {canSubmit && (
            <button type="button" onClick={() => save(true)} disabled={busy !== null} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {busy === "submit" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Lưu & gửi duyệt
            </button>
          )}
        </div>
      )}
    </form>
  );
}

export function MapStatusActions({ mapId, status }: { mapId: string; status: CraftlandMap["status"] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (action: "archive" | "restore") => {
    if (action === "archive" && !window.confirm("Lưu trữ bản đồ này? Bản đồ sẽ không còn hiển thị công khai.")) return;
    setBusy(true);
    try {
      await apiCall(`/api/craftland/studio/maps/${mapId}`, "PATCH", { action });
      toast.success(action === "archive" ? "Đã lưu trữ bản đồ" : "Đã khôi phục về bản nháp");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (status === "archived") {
    return <button type="button" disabled={busy} onClick={() => run("restore")} className="text-sm font-medium text-primary hover:underline disabled:opacity-50">Khôi phục</button>;
  }
  if (["draft", "rejected", "pending", "published"].includes(status)) {
    return <button type="button" disabled={busy} onClick={() => run("archive")} className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50">Lưu trữ</button>;
  }
  return null;
}

// ── Xác minh ─────────────────────────────────────────────────

export function VerificationForm({ defaultName, canWithdraw, needsInfo }: { defaultName: string; canWithdraw: boolean; needsInfo: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ display_name: defaultName, about: "", evidence: "", public_links: [{ label: "", url: "" }] as CraftlandLink[] });
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      {(!canWithdraw || needsInfo) && (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await apiCall("/api/craftland/studio/verification", "POST", {
                ...form,
                public_links: form.public_links.filter((l) => l.label.trim() && l.url.trim()),
              });
              toast.success("Đã gửi yêu cầu xác minh");
              router.refresh();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Tên hiển thị cần xác minh" required>
            <input className={inputCls} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} minLength={2} maxLength={60} required />
          </Field>
          <Field label="Thông tin creator" required hint="Bạn là ai, làm bản đồ Craftland từ khi nào, các bản đồ tiêu biểu.">
            <textarea className={inputCls} rows={4} minLength={20} maxLength={2000} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} required />
          </Field>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Liên kết công khai <span className="text-destructive">*</span></span>
            <LinkListEditor value={form.public_links} onChange={(v) => setForm({ ...form, public_links: v })} />
          </div>
          <Field label="Bằng chứng" required hint="VD: bản đồ đứng tên bạn trong game, kênh có video làm map, bài đăng xác nhận từ kênh của bạn có nhắc tới ArexNetwork…">
            <textarea className={inputCls} rows={4} minLength={20} maxLength={3000} value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} required />
          </Field>
          <button type="submit" disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {needsInfo ? "Gửi bổ sung" : "Gửi yêu cầu xác minh"}
          </button>
        </form>
      )}
      {canWithdraw && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm("Rút yêu cầu xác minh đang mở?")) return;
            setBusy(true);
            try {
              await apiCall("/api/craftland/studio/verification", "DELETE");
              toast.success("Đã rút yêu cầu");
              router.refresh();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="text-sm font-medium text-muted-foreground hover:text-destructive"
        >
          Rút yêu cầu
        </button>
      )}
    </div>
  );
}

// ── Chọn khoảng thời gian ────────────────────────────────────

export function RangePicker({ basePath, current, extra }: { basePath: string; current: { range?: string; from?: string; to?: string }; extra?: Record<string, string | undefined> }) {
  const router = useRouter();
  const [from, setFrom] = useState(current.from ?? "");
  const [to, setTo] = useState(current.to ?? "");
  const go = (p: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...extra, ...p })) if (v) sp.set(k, v);
    router.push(`${basePath}${sp.toString() ? `?${sp}` : ""}`);
  };
  const active = current.from && current.to ? "custom" : current.range ?? "30d";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="group" aria-label="Khoảng thời gian">
        {(["7d", "30d", "90d"] as const).map((r) => (
          <button key={r} type="button" aria-pressed={active === r} onClick={() => go({ range: r })}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", active === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {r.replace("d", " ngày")}
          </button>
        ))}
      </div>
      <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); if (from && to) go({ from, to }); }}>
        <input type="date" aria-label="Từ ngày" value={from} onChange={(e) => setFrom(e.target.value)} className={cn(inputCls, "h-9 w-auto py-1")} />
        <span className="text-muted-foreground">→</span>
        <input type="date" aria-label="Đến ngày" value={to} onChange={(e) => setTo(e.target.value)} className={cn(inputCls, "h-9 w-auto py-1")} />
        <button type="submit" disabled={!from || !to} className={cn("h-9 rounded-lg border px-3 text-sm font-medium disabled:opacity-50", active === "custom" ? "border-primary text-primary" : "border-border")}>Áp dụng</button>
      </form>
    </div>
  );
}
