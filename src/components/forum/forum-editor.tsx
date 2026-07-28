"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Quote, Code, Link2, Heading2, ImagePlus, Loader2,
} from "lucide-react";

type ForumEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minLength?: number;
  className?: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Must match allowed_mime_types on the `forum` storage bucket. iOS hands over
// HEIC from the photo library, which storage rejects with a raw English error.
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function Btn({ active, title, disabled, onClick, children }: {
  active?: boolean; title: string; disabled?: boolean;
  onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-40",
        active
          ? "bg-primary/10 text-primary dark:bg-amber-400/10 dark:text-amber-400"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function ForumEditor({ value, onChange, placeholder, className }: ForumEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: "rounded-lg bg-muted px-3 py-2 font-mono text-sm" } } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline underline-offset-2" } }),
      // Base64 is rejected: images always go through /api/upload so the HTML we
      // store stays small enough for the content length limit.
      Image.configure({ allowBase64: false, HTMLAttributes: { class: "rounded-xl max-w-full h-auto" } }),
      Placeholder.configure({ placeholder: placeholder ?? "Viết nội dung bài đăng..." }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "min-h-[160px] outline-none prose prose-sm dark:prose-invert max-w-none p-3" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  });

  // Reset editor when parent clears value (e.g. after successful submit)
  useEffect(() => {
    if (!editor) return;
    if (!value || value === "<p></p>") {
      editor.commands.clearContent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!editor || files.length === 0) return;
    setUploadErr("");
    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          setUploadErr(`Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF — "${file.name}" không dùng được.`);
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          setUploadErr(`"${file.name}" vượt quá 5MB.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("bucket", "forum");
        const res = await fetch("/api/upload", { method: "POST", body: fd }).catch(() => null);
        if (!res) { setUploadErr("Lỗi kết nối khi tải ảnh."); break; }
        const data = await res.json().catch(() => ({})) as { publicUrl?: string; error?: string };
        if (res.status === 401) { setUploadErr("Vui lòng đăng nhập để tải ảnh lên."); break; }
        if (!res.ok || !data.publicUrl) { setUploadErr(data.error ?? "Tải ảnh thất bại."); break; }
        editor.chain().focus().setImage({ src: data.publicUrl, alt: file.name }).run();
      }
    } finally {
      setUploading(false);
    }
  }, [editor]);

  // Paste / drag & drop straight into the editor area.
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    e.preventDefault();
    void uploadFiles(files);
  }, [uploadFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    e.preventDefault();
    void uploadFiles(files);
  }, [uploadFiles]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Nhập URL:");
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-background focus-within:border-primary/50 transition-colors", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
        <Btn title="Đậm (Ctrl+B)"    active={editor.isActive("bold")}         onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-3.5"/></Btn>
        <Btn title="Nghiêng (Ctrl+I)" active={editor.isActive("italic")}       onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-3.5"/></Btn>
        <Btn title="Gạch chân"       active={editor.isActive("underline")}     onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="size-3.5"/></Btn>
        <div className="mx-1 h-4 w-px bg-border" />
        <Btn title="Tiêu đề"         active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-3.5"/></Btn>
        <Btn title="Trích dẫn"       active={editor.isActive("blockquote")}    onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-3.5"/></Btn>
        <Btn title="Code"            active={editor.isActive("code")}          onClick={() => editor.chain().focus().toggleCode().run()}><Code className="size-3.5"/></Btn>
        <div className="mx-1 h-4 w-px bg-border" />
        <Btn title="Danh sách"       active={editor.isActive("bulletList")}    onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-3.5"/></Btn>
        <Btn title="Danh sách số"    active={editor.isActive("orderedList")}   onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-3.5"/></Btn>
        <div className="mx-1 h-4 w-px bg-border" />
        <Btn title="Chèn link"       active={editor.isActive("link")}          onClick={addLink}><Link2 className="size-3.5"/></Btn>
        <Btn title="Tải ảnh lên (tối đa 5MB)" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
        </Btn>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void uploadFiles(files);
          }}
        />
      </div>

      {/* Editor area */}
      <div onPaste={handlePaste} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
        <EditorContent editor={editor} />
      </div>

      {(uploading || uploadErr) && (
        <div className="border-t border-border px-3 py-1.5 text-[11px]">
          {uploading && <span className="text-muted-foreground">Đang tải ảnh lên...</span>}
          {uploadErr && <span className="text-destructive">{uploadErr}</span>}
        </div>
      )}
    </div>
  );
}
