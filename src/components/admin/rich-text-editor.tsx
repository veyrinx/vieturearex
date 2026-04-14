"use client";

import { useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

const COLORS = [
  { label: "Đen", value: "#000000" },
  { label: "Trắng", value: "#ffffff" },
  { label: "Xanh dương", value: "#0052ff" },
  { label: "Xanh lá", value: "#28a745" },
  { label: "Đỏ", value: "#dc3545" },
  { label: "Vàng", value: "#ffc107" },
  { label: "Tím", value: "#6f42c1" },
  { label: "Hồng", value: "#e83e8c" },
  { label: "Cam", value: "#fd7e14" },
  { label: "Xám", value: "#6c757d" },
];

function ToolbarButton({
  onClick,
  active,
  title,
  children,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
        "hover:bg-muted text-muted-foreground hover:text-foreground",
        active && "bg-primary/15 text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}

export function RichTextEditor({ value, onChange, placeholder = "Nhập nội dung...", className }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ strike: false }),
      Underline,
      Strike,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-3 outline-none focus:outline-none",
      },
    },
  });

  // Chỉ sync content từ ngoài vào khi editor chưa có nội dung (lần đầu mount)
  // KHÔNG sync liên tục để tránh reset định dạng khi đang gõ
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!editor) return;

    const normalizedValue = value.trim();
    const currentHtml = editor.getHTML().trim();

    if (
      normalizedValue &&
      currentHtml !== normalizedValue &&
      (editor.isEmpty || !initializedRef.current)
    ) {
      editor.commands.setContent(normalizedValue, { emitUpdate: false });
    }

    initializedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Nhập URL:", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const insertImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Nhập URL ảnh:");
    if (!url) return;
    const alt = window.prompt("Chú thích ảnh (tùy chọn):") ?? "";
    editor.chain().focus().setImage({ src: url, alt }).run();
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    const rows = Number(window.prompt("Số hàng:", "3")) || 3;
    const cols = Number(window.prompt("Số cột:", "3")) || 3;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  }, [editor]);

  const setColor = useCallback((color: string) => {
    if (!editor) return;
    editor.chain().focus().setColor(color).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-xl border border-border bg-background", className)}>
      {/* Toolbar - sticky khi cuộn */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1.5 backdrop-blur-sm">

        {/* Text style */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="In đậm">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M7.08 4.72h4.44c2.03 0 3.5.3 4.41.87.92.57 1.37 1.49 1.37 2.75 0 .85-.2 1.55-.6 2.1-.4.54-.93.87-1.6.98v.1c.91.2 1.56.58 1.96 1.13.4.56.6 1.3.6 2.2 0 1.31-.47 2.33-1.4 3.06A6.1 6.1 0 0 1 12.41 19H7.08V4.72zm3.03 5.66h1.75c.82 0 1.42-.13 1.79-.38.36-.26.55-.68.55-1.26 0-.55-.2-.94-.6-1.18a3.86 3.86 0 0 0-1.9-.36h-1.6v3.18zm0 2.4v3.72h1.97c.83 0 1.45-.16 1.84-.48.4-.32.6-.8.6-1.46 0-1.19-.85-1.78-2.54-1.78h-1.87z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Nghiêng">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="m14.73 6.5-3.67 11H14l-.3 1.5H6l.3-1.5h2.81l3.68-11H10l.3-1.5H18l-.3 1.5h-2.97z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Gạch dưới">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path d="M6 21.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM15.754 14.006V5h1.528v8.95c0 1.574-.476 2.807-1.424 3.703-.948.896-2.253 1.347-3.92 1.347-1.667 0-2.952-.454-3.862-1.356-.904-.902-1.358-2.145-1.358-3.733V5h1.528v9.025c0 1.168.32 2.072.966 2.704.646.632 1.592.945 2.83.945 1.183 0 2.1-.313 2.746-.945.646-.638.966-1.548.966-2.723Z" fill="currentColor"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Gạch ngang">
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.349 15.508c0 1.263.43 2.249 1.292 2.957.861.708 2.01 1.063 3.445 1.063 1.436 0 2.571-.355 3.407-1.063.836-.708 1.254-1.636 1.254-2.785 0-.885-.205-1.611-.614-2.18H18V12H6.432v1.5h7.175c.388.185.688.367.9.544.492.408.737.957.737 1.646 0 .753-.27 1.362-.813 1.828-.542.46-1.324.689-2.345.689-1.02 0-1.815-.227-2.383-.68-.561-.453-.842-1.126-.842-2.019v-.23H7.349v.23ZM8.351 11h2.918c-.667-.268-1.147-.523-1.441-.765-.473-.396-.709-.916-.709-1.56 0-.715.233-1.28.699-1.694.466-.415 1.193-.622 2.182-.622.983 0 1.723.242 2.22.727.498.485.747 1.117.747 1.895v.21h1.512v-.21c0-1.148-.405-2.093-1.215-2.833-.804-.74-1.892-1.11-3.264-1.11-1.372 0-2.447.348-3.225 1.043-.772.69-1.158 1.573-1.158 2.651 0 .948.245 1.704.734 2.268Z" fill="currentColor"/></svg>
        </ToolbarButton>

        <Divider />

        {/* Màu chữ */}
        <div className="relative group">
          <ToolbarButton onClick={() => {}} title="Màu chữ">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path d="M11 2 5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z" fill="currentColor"/></svg>
          </ToolbarButton>
          <div className="absolute left-0 top-full z-50 hidden group-hover:flex flex-wrap gap-1 p-2 bg-card border border-border rounded-xl shadow-lg w-[140px]">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setColor(c.value)}
                className="h-5 w-5 rounded-full border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        <Divider />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Canh trái">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M3.75 5.25h16.5a.75.75 0 1 1 0 1.5H3.75a.75.75 0 0 1 0-1.5zm0 4h8.5a.75.75 0 1 1 0 1.5h-8.5a.75.75 0 1 1 0-1.5zm0 4h16.5a.75.75 0 1 1 0 1.5H3.75a.75.75 0 1 1 0-1.5zm0 4h8.5a.75.75 0 1 1 0 1.5h-8.5a.75.75 0 1 1 0-1.5z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Canh giữa">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M3.75 5.25h16.5a.75.75 0 1 1 0 1.5H3.75a.75.75 0 0 1 0-1.5zm4 4h8.5a.75.75 0 1 1 0 1.5h-8.5a.75.75 0 1 1 0-1.5zm-4 4h16.5a.75.75 0 1 1 0 1.5H3.75a.75.75 0 1 1 0-1.5zm4 4h8.5a.75.75 0 1 1 0 1.5h-8.5a.75.75 0 1 1 0-1.5z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Canh phải">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M20.25 5.25a.75.75 0 1 1 0 1.5H3.75a.75.75 0 0 1 0-1.5h16.5zm0 4a.75.75 0 1 1 0 1.5h-8.5a.75.75 0 1 1 0-1.5h8.5zm0 4a.75.75 0 1 1 0 1.5H3.75a.75.75 0 1 1 0-1.5h16.5zm0 4a.75.75 0 1 1 0 1.5h-8.5a.75.75 0 1 1 0-1.5h8.5z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Canh đều 2 bên">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path d="M3.8 17.3h16.6c.9 0 .9 1.6-.1 1.5H3.8c-.8 0-.9-1.4 0-1.5zm0-8h16.6c.9 0 .9 1.6-.1 1.5H3.8c-.8 0-.9-1.4 0-1.5zm0 4h16.6c.9 0 .9 1.6-.1 1.5H3.8c-.8 0-.9-1.4 0-1.5zm0-8c5.5 0 11-.1 16.5 0 .9 0 .9 1.5-.1 1.5-5.5-.1-11 0-16.5-.1-.9 0-.9-1.4-.1-1.4Z" fill="currentColor"/></svg>
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Danh sách dấu chấm">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M11.75 5.25h7.5a.75.75 0 1 1 0 1.5h-7.5a.75.75 0 1 1 0-1.5zm0 6h7.5a.75.75 0 1 1 0 1.5h-7.5a.75.75 0 1 1 0-1.5zm0 6h7.5a.75.75 0 1 1 0 1.5h-7.5a.75.75 0 1 1 0-1.5zM6 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Danh sách số">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" fillRule="evenodd" d="M11.75 5.25h7.5a.75.75 0 1 1 0 1.5h-7.5a.75.75 0 1 1 0-1.5zm0 6h7.5a.75.75 0 1 1 0 1.5h-7.5a.75.75 0 1 1 0-1.5zm0 6h7.5a.75.75 0 1 1 0 1.5h-7.5a.75.75 0 1 1 0-1.5zM5.69 8V4.07h-.06l-1.21.84v-.96l1.28-.88h1.02V8H5.7zm-1.25 3.04c0-.95.73-1.6 1.8-1.6 1.03 0 1.75.6 1.75 1.44 0 .54-.3 1-1.15 1.8l-.94.9v.06h2.16v.86H4.5v-.72l1.6-1.58c.7-.67.88-.93.88-1.25 0-.4-.32-.68-.78-.68-.47 0-.8.32-.8.77v.02h-.96v-.02zm1.26 7.82v-.77h.6c.47 0 .79-.27.79-.68 0-.4-.3-.64-.79-.64-.48 0-.8.27-.82.7h-.96c.04-.94.73-1.53 1.8-1.53 1.02 0 1.75.56 1.75 1.33 0 .57-.36 1.02-.91 1.13v.06c.67.08 1.1.53 1.1 1.18 0 .86-.81 1.49-1.94 1.49-1.1 0-1.84-.61-1.89-1.54h.99c.03.42.38.68.91.68.52 0 .88-.3.88-.71 0-.43-.34-.7-.9-.7h-.6z"/></svg>
        </ToolbarButton>

        <Divider />

        {/* Link & Image */}
        <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Chèn/sửa link">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={insertImage} title="Chèn ảnh từ URL">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </ToolbarButton>

        <Divider />

        {/* Table */}
        <ToolbarButton onClick={insertTable} title="Tạo bảng">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </ToolbarButton>
        {editor.isActive("table") && (
          <>
            <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Thêm cột">+C</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Thêm hàng">+R</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="Xóa cột">-C</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="Xóa hàng">-R</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Xóa bảng" className="text-destructive">✕</ToolbarButton>
          </>
        )}

        <Divider />

        {/* Headings */}
        {([1, 2, 3, 4, 5, 6] as const).map((level) => (
          <ToolbarButton
            key={level}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            active={editor.isActive("heading", { level })}
            title={`Tiêu đề ${level}`}
          >
            <span className="text-xs font-bold">H{level}</span>
          </ToolbarButton>
        ))}

        <Divider />

        {/* Blockquote & Code */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Trích dẫn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Khối code">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </ToolbarButton>

        <Divider />

        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Hoàn tác">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Làm lại">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="text-foreground [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:p-3 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/50 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-muted [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-primary/40 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-muted-foreground"
      />
    </div>
  );
}
