import { useRef, useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { ImagePlus, Link2, Loader2, Trash2 } from "lucide-react";
import { Button, Input, cx } from "@/components/ui";
import { errorMessage, useToast } from "@/components/toast";
import { uploadImage } from "@/lib/api";
import { haptic, isNative } from "@/lib/native";

type Bucket = "logos" | "forum" | "events";

/**
 * Chọn ảnh → tải lên Supabase Storage → trả về URL công khai.
 * Native: mở camera/thư viện qua plugin. Web: dùng <input type="file">.
 * Vẫn cho dán sẵn một URL có sẵn (ảnh đã nằm trên CDN khác).
 */
export function ImagePicker({
  value,
  onChange,
  bucket = "logos",
  label = "Ảnh bìa",
  aspect = "16/9",
}: {
  value: string;
  onChange: (url: string) => void;
  bucket?: Bucket;
  label?: string;
  aspect?: string;
}) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [urlMode, setUrlMode] = useState(false);

  async function upload(blob: Blob, fileName: string) {
    setBusy(true);
    try {
      const url = await uploadImage(blob, { bucket, fileName });
      onChange(url);
      toast.success("Đã tải ảnh lên.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function pickNative(source: CameraSource) {
    haptic("light");
    try {
      const photo = await Camera.getPhoto({
        quality: 82,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source,
        // Ảnh bìa hiển thị rộng nhất ~1600px, nén sẵn cho nhẹ (giới hạn 5MB).
        width: 1600,
      });
      if (!photo.webPath) return;
      const blob = await (await fetch(photo.webPath)).blob();
      await upload(blob, `hub-${Date.now()}.${photo.format || "jpg"}`);
    } catch (error) {
      // Người dùng bấm huỷ cũng ném lỗi — không báo đỏ cho trường hợp đó.
      const message = errorMessage(error).toLowerCase();
      if (message.includes("cancel") || message.includes("huỷ")) return;
      toast.error(errorMessage(error));
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-mist-300">{label}</span>
        <button
          type="button"
          onClick={() => setUrlMode((v) => !v)}
          className="flex items-center gap-1 text-[12px] text-mist-500"
        >
          <Link2 className="size-3.5" />
          {urlMode ? "Chọn từ máy" : "Dán URL"}
        </button>
      </div>

      {urlMode ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="https://…/anh.jpg"
          inputMode="url"
          autoCapitalize="none"
        />
      ) : value ? (
        <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
          <img
            src={value}
            alt=""
            className="w-full object-cover"
            style={{ aspectRatio: aspect }}
            onError={() => toast.warning("Không tải được ảnh xem trước — kiểm tra lại đường dẫn.")}
          />
          <div className="absolute right-2 bottom-2 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={ImagePlus}
              loading={busy}
              onClick={() =>
                isNative ? void pickNative(CameraSource.Prompt) : fileInput.current?.click()
              }
            >
              Đổi
            </Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => onChange("")}>
              Xoá
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            isNative ? void pickNative(CameraSource.Prompt) : fileInput.current?.click()
          }
          className={cx(
            "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-600 bg-ink-900 py-10 text-mist-500 transition active:bg-ink-800",
            busy && "opacity-60",
          )}
        >
          {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          <span className="text-[13px]">
            {busy ? "Đang tải ảnh lên…" : "Chụp ảnh hoặc chọn từ thư viện"}
          </span>
          <span className="text-[11px]">JPG/PNG · tối đa 5MB</span>
        </button>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file, file.name);
        }}
      />
    </div>
  );
}
