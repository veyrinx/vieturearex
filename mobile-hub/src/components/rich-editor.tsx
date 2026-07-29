import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image as ImageExtension } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/components/ui";
import { uploadImage } from "@/lib/api";
import { haptic } from "@/lib/native";

/**
 * Trình soạn thảo giàu định dạng cho màn Đăng / Sửa nội dung.
 *
 * Trước đây ô nội dung là chữ thuần: lúc sửa thì `stripHtmlToPlain()` bóc hết
 * thẻ ra, lúc lưu thì `plainTextToHtml()` bọc lại thành <p> — nên mở một bài
 * vốn có bảng, ảnh, heading rồi bấm lưu là mất sạch định dạng. Tiptap giữ
 * nguyên HTML từ đầu tới cuối nên không còn vòng bóc–bọc đó nữa.
 *
 * StarterKit v3 đã gồm sẵn Link và Underline — KHÔNG thêm hai extension đó lần
 * nữa, tiptap sẽ báo trùng tên.
 */

export function RichEditor({
  value,
  onChange,
  placeholder = "Viết nội dung bài…",
  onUploadError,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onUploadError?: (message: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      // Không gắn class Tailwind vào <img>: HTML này còn hiển thị trên website,
      // nơi không có bộ class của Hub. Bo góc để CSS .prose-hub lo.
      ImageExtension,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    // Bundle chạy trong WebView, không có bước dựng sẵn phía máy chủ.
    immediatelyRender: true,
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      // Tiptap trả "<p></p>" cho tài liệu rỗng — quy về chuỗi rỗng để phần
      // kiểm tra "nội dung không được để trống" ở màn Đăng chạy đúng.
      onChange(instance.isEmpty ? "" : html);
    },
    editorProps: {
      attributes: {
        class:
          "prose-hub min-h-[220px] w-full px-3.5 py-3 text-[14.5px] leading-relaxed outline-none",
      },
    },
  });

  // Khi bấm "Sửa" một bài khác, `value` đổi từ ngoài vào — nạp lại nội dung.
  // So sánh trước để không tự ghi đè lúc người dùng đang gõ (mỗi lần gõ là một
  // lần onChange, `value` quay lại đúng bằng getHTML()).
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return null;

  async function pickImage(file: File) {
    setUploading(true);
    try {
      const url = await uploadImage(file, { bucket: "forum" });
      editor?.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      onUploadError?.(error instanceof Error ? error.message : "Không tải được ảnh lên.");
    } finally {
      setUploading(false);
    }
  }

  function toggleLink() {
    const previous = editor?.getAttributes("link").href as string | undefined;
    if (previous) {
      editor?.chain().focus().unsetLink().run();
      return;
    }
    const href = window.prompt("Dán đường dẫn:", "https://");
    if (!href || href === "https://") return;
    editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const hasLink = editor.isActive("link");

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-900/60 focus-within:border-ink-600">
      {/* Thanh công cụ cuộn ngang: màn hình điện thoại không đủ chỗ xếp hết
          nút trên một hàng, mà xuống hàng thì đẩy ô soạn thảo tụt quá sâu. */}
      <div className="scrollbar-none flex gap-0.5 overflow-x-auto border-b border-ink-800 px-1.5 py-1.5">
        <ToolButton icon={Bold} label="Đậm" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolButton icon={Italic} label="Nghiêng" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolButton icon={UnderlineIcon} label="Gạch chân" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <ToolButton icon={Strikethrough} label="Gạch ngang" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />

        <Divider />

        <ToolButton icon={Heading2} label="Tiêu đề lớn" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolButton icon={Heading3} label="Tiêu đề nhỏ" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
        <ToolButton icon={List} label="Danh sách" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolButton icon={ListOrdered} label="Danh sách số" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolButton icon={Quote} label="Trích dẫn" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />

        <Divider />

        <ToolButton icon={hasLink ? Unlink : LinkIcon} label={hasLink ? "Bỏ liên kết" : "Liên kết"} active={hasLink} onClick={toggleLink} />
        <ToolButton icon={ImagePlus} label="Ảnh" loading={uploading} onClick={() => fileInput.current?.click()} />

        <Divider />

        <ToolButton icon={Undo2} label="Hoàn tác" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
        <ToolButton icon={Redo2} label="Làm lại" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Xoá giá trị để chọn lại đúng file vừa rồi vẫn kích hoạt onChange.
          event.target.value = "";
          if (file) void pickImage(file);
        }}
      />
    </div>
  );
}

function Divider() {
  return <span className="my-1 w-px shrink-0 bg-ink-800" />;
}

function ToolButton({
  icon: Icon,
  label,
  active,
  disabled,
  loading,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled || loading}
      // onMouseDown thay vì onClick: bàn phím ảo đang mở, để nút nhận focus là
      // bàn phím sập xuống rồi lệnh áp vào vùng chọn đã mất.
      onMouseDown={(event) => {
        event.preventDefault();
        if (disabled || loading) return;
        haptic("light");
        onClick();
      }}
      className={cx(
        "grid size-9 shrink-0 place-items-center rounded-lg transition",
        active ? "bg-cyan-glow/15 text-cyan-glow" : "text-mist-300 active:bg-ink-800",
        (disabled || loading) && "opacity-35",
      )}
    >
      <Icon className={cx("size-4", loading && "animate-pulse")} />
    </button>
  );
}

export type { Editor };
