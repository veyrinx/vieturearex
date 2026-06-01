"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Quote, Code, Link2, Heading2,
} from "lucide-react";

type ForumEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minLength?: number;
  className?: string;
};

function Btn({ active, title, onClick, children }: {
  active?: boolean; title: string;
  onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg text-sm transition-colors",
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
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: "rounded-lg bg-muted px-3 py-2 font-mono text-sm" } } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline underline-offset-2" } }),
      Placeholder.configure({ placeholder: placeholder ?? "Viết nội dung bài đăng..." }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "min-h-[160px] outline-none prose prose-sm dark:prose-invert max-w-none p-3" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  });

  // Sync external value reset (e.g. after submit)
  useEffect(() => {
    if (!editor || value === editor.getHTML()) return;
    if (!value) editor.commands.clearContent();
  }, [value, editor]);

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
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
