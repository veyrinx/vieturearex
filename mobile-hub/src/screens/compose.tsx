import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Image as ImageIcon, Newspaper, Save, Send } from "lucide-react";
import { Button, Card, Field, Input, Segmented, Select, Textarea } from "@/components/ui";
import { ImagePicker } from "@/components/image-picker";
import { errorMessage, useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { useAddGallery, useSaveEvent, useSaveNews } from "@/lib/queries";
import { fromLocalInputValue, toLocalInputValue, toSlug } from "@/lib/format";
import { RichEditor } from "@/components/rich-editor";
import type { EventItem, GalleryItem, NewsItem } from "@/types";

export type ComposeTarget =
  | { kind: "news"; item?: NewsItem }
  | { kind: "event"; item?: EventItem }
  | { kind: "gallery"; item?: GalleryItem };

const DEFAULT_CATEGORIES = ["ESPORTS", "PATCH NOTE", "CỘNG ĐỒNG"];

/** Danh mục tin do admin cấu hình trong settings `news.categories`. */
function useNewsCategories() {
  const query = useQuery({
    queryKey: ["news-categories"],
    staleTime: 5 * 60_000,
    queryFn: () =>
      api<{ settings: { key: string; value: string }[] }>("/api/admin/settings").then(
        (r) => r.settings.find((s) => s.key === "news.categories")?.value ?? "",
      ),
    // Support/manager không đọc được settings (cần Admin) — im lặng dùng mặc định.
    retry: false,
  });

  return useMemo(() => {
    const parsed = (query.data ?? "")
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean);
    return parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  }, [query.data]);
}

export function ComposeScreen() {
  const location = useLocation();
  const target = location.state as ComposeTarget | null;
  const [kind, setKind] = useState<ComposeTarget["kind"]>(target?.kind ?? "news");

  // Mở từ nút "Sửa" ở tab Nội dung → nhảy đúng loại đang sửa.
  useEffect(() => {
    if (target?.kind) setKind(target.kind);
  }, [target?.kind]);

  return (
    <div className="space-y-5">
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: "news", label: "Tin tức" },
          { value: "event", label: "Sự kiện" },
          { value: "gallery", label: "Thư viện" },
        ]}
      />

      {kind === "news" && <NewsForm item={target?.kind === "news" ? target.item : undefined} />}
      {kind === "event" && <EventForm item={target?.kind === "event" ? target.item : undefined} />}
      {kind === "gallery" && <GalleryForm />}
    </div>
  );
}

// ── Tin tức ─────────────────────────────────────────────────────────────────

function NewsForm({ item }: { item?: NewsItem }) {
  const navigate = useNavigate();
  const toast = useToast();
  const save = useSaveNews();
  const categories = useNewsCategories();

  const [title, setTitle] = useState(item?.title ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(item?.slug));
  const [category, setCategory] = useState(item?.category ?? categories[0]);
  const [excerpt, setExcerpt] = useState(item?.excerpt ?? "");
  const [cover, setCover] = useState(item?.cover ?? "");
  // Giữ nguyên HTML, không bóc về chữ thuần nữa — trình soạn thảo tự hiểu.
  const [content, setContent] = useState(item?.content ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Danh mục về sau khi form đã dựng → chọn giá trị đầu nếu chưa đặt.
  useEffect(() => {
    if (!item && !categories.includes(category)) setCategory(categories[0]);
  }, [categories, category, item]);

  const autoSlug = slugTouched ? slug : toSlug(title);

  function validate() {
    const next: Record<string, string> = {};
    if (title.trim().length < 6) next.title = "Tiêu đề cần ít nhất 6 ký tự.";
    if (title.trim().length > 160) next.title = "Tiêu đề tối đa 160 ký tự.";
    if (!cover.trim()) next.cover = "Chọn ảnh bìa.";
    if (!content.trim()) next.content = "Nội dung không được để trống.";
    if (excerpt.length > 280) next.excerpt = "Tóm tắt tối đa 280 ký tự.";
    if (autoSlug.length < 4) next.slug = "Đường dẫn cần ít nhất 4 ký tự.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(status: "draft" | "published") {
    if (!validate()) {
      toast.warning("Kiểm tra lại các ô còn thiếu.");
      return;
    }

    try {
      await save.mutateAsync({
        id: item?.id,
        title: title.trim(),
        slug: autoSlug,
        excerpt: excerpt.trim(),
        content,
        cover: cover.trim(),
        category,
        status,
        created_at: item?.created_at,
      });
      toast.success(
        item
          ? "Đã cập nhật bài viết."
          : status === "published"
            ? "Đã đăng bài viết."
            : "Đã lưu bản nháp.",
      );
      navigate("/noi-dung");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Card className="space-y-4">
      <Header icon={Newspaper} title={item ? "Sửa bài viết" : "Bài viết mới"} />

      <Field label="Tiêu đề" required error={errors.title}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Tổng hợp thay đổi bản OB50"
          maxLength={160}
        />
      </Field>

      <Field
        label="Đường dẫn (slug)"
        hint="Bỏ trống để tự sinh từ tiêu đề."
        error={errors.slug}
      >
        <Input
          value={autoSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(toSlug(e.target.value));
          }}
          placeholder="tong-hop-thay-doi-ob50"
          autoCapitalize="none"
        />
      </Field>

      <Field label="Danh mục">
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <ImagePicker value={cover} onChange={setCover} bucket="logos" label="Ảnh bìa" />
        {errors.cover && <p className="mt-1 text-[12px] text-danger">{errors.cover}</p>}
      </div>

      <Field
        label="Tóm tắt"
        hint={`${excerpt.length}/280 — để trống sẽ tự sinh từ tiêu đề.`}
        error={errors.excerpt}
      >
        <Textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder="Một hai câu mô tả ngắn hiển thị ở trang danh sách."
        />
      </Field>

      <Field label="Nội dung" required error={errors.content}>
        <RichEditor
          value={content}
          onChange={setContent}
          onUploadError={(message) => toast.error(message)}
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <Button
          variant="secondary"
          block
          icon={Save}
          loading={save.isPending}
          onClick={() => void submit("draft")}
        >
          Lưu nháp
        </Button>
        <Button block icon={Send} loading={save.isPending} onClick={() => void submit("published")}>
          {item ? "Cập nhật" : "Đăng ngay"}
        </Button>
      </div>
    </Card>
  );
}

// ── Sự kiện ─────────────────────────────────────────────────────────────────

function EventForm({ item }: { item?: EventItem }) {
  const navigate = useNavigate();
  const toast = useToast();
  const save = useSaveEvent();

  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [startDate, setStartDate] = useState(toLocalInputValue(item?.start_date));
  const [endDate, setEndDate] = useState(
    toLocalInputValue(item?.end_date ?? new Date(Date.now() + 7 * 86400_000).toISOString()),
  );
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [link, setLink] = useState(item?.link ?? "");
  const [region, setRegion] = useState(item?.server_region ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (title.trim().length < 4) next.title = "Tên sự kiện cần ít nhất 4 ký tự.";
    if (!imageUrl.trim()) next.image = "Chọn ảnh sự kiện.";
    if (!startDate) next.start = "Chọn thời gian bắt đầu.";
    if (!endDate) next.end = "Chọn thời gian kết thúc.";
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      next.end = "Kết thúc phải sau lúc bắt đầu.";
    }
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) {
      next.link = "Link phải bắt đầu bằng http:// hoặc https://";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) {
      toast.warning("Kiểm tra lại các ô còn thiếu.");
      return;
    }

    try {
      await save.mutateAsync({
        id: item?.id,
        title: title.trim(),
        description: description.trim(),
        start_date: fromLocalInputValue(startDate),
        end_date: fromLocalInputValue(endDate),
        image_url: imageUrl.trim(),
        link: link.trim(),
        server_region: region.trim(),
      });
      toast.success(item ? "Đã cập nhật sự kiện." : "Đã tạo sự kiện.");
      navigate("/noi-dung", { state: { tab: "events" } });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Card className="space-y-4">
      <Header icon={CalendarRange} title={item ? "Sửa sự kiện" : "Sự kiện mới"} />

      <Field label="Tên sự kiện" required error={errors.title}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Giải đấu mùa hè 2026"
          maxLength={120}
        />
      </Field>

      <div>
        <ImagePicker value={imageUrl} onChange={setImageUrl} bucket="events" label="Ảnh sự kiện" />
        {errors.image && <p className="mt-1 text-[12px] text-danger">{errors.image}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Bắt đầu" required error={errors.start}>
          <Input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field label="Kết thúc" required error={errors.end}>
          <Input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Mô tả" hint={`${description.length}/3000`}>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={3000}
          placeholder="Thể lệ, phần thưởng, cách tham gia…"
        />
      </Field>

      <Field label="Link chi tiết" error={errors.link} hint="Không bắt buộc.">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://arexnetwork.site/…"
          inputMode="url"
          autoCapitalize="none"
        />
      </Field>

      <Field label="Máy chủ" hint="Không bắt buộc — VD: vn, sg, global.">
        <Input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="vn"
          maxLength={20}
          autoCapitalize="none"
        />
      </Field>

      <Button block icon={Send} loading={save.isPending} onClick={() => void submit()}>
        {item ? "Cập nhật sự kiện" : "Tạo sự kiện"}
      </Button>
    </Card>
  );
}

// ── Thư viện ảnh ────────────────────────────────────────────────────────────

function GalleryForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const add = useAddGallery();

  const [imageUrl, setImageUrl] = useState("");
  const [tag, setTag] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit() {
    const next: Record<string, string> = {};
    if (!imageUrl.trim()) next.image = "Chọn ảnh cần thêm.";
    if (tag.trim().length < 2) next.tag = "Nhãn cần ít nhất 2 ký tự.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await add.mutateAsync({ image_url: imageUrl.trim(), tag: tag.trim() });
      toast.success("Đã thêm ảnh vào thư viện.");
      setImageUrl("");
      setTag("");
      navigate("/noi-dung", { state: { tab: "gallery" } });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Card className="space-y-4">
      <Header icon={ImageIcon} title="Thêm ảnh thư viện" />

      <div>
        <ImagePicker
          value={imageUrl}
          onChange={setImageUrl}
          bucket="logos"
          label="Ảnh"
          aspect="4/3"
        />
        {errors.image && <p className="mt-1 text-[12px] text-danger">{errors.image}</p>}
      </div>

      <Field label="Nhãn" required error={errors.tag} hint="Dùng để lọc ảnh ở trang thư viện.">
        <Input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="VD: Giải đấu, Fanart, Sự kiện"
          maxLength={60}
        />
      </Field>

      <Button block icon={Send} loading={add.isPending} onClick={() => void submit()}>
        Thêm vào thư viện
      </Button>
    </Card>
  );
}

function Header({ icon: Icon, title }: { icon: typeof Newspaper; title: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-ink-800 pb-3">
      <span className="grid size-9 place-items-center rounded-xl bg-violet-glow/12 text-violet-glow">
        <Icon className="size-4" />
      </span>
      <h2 className="text-[15px] font-semibold">{title}</h2>
    </div>
  );
}

