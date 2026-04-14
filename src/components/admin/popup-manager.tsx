"use client";

import { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Heading2, Heading3,
  Eye, EyeOff, Save, Link as LinkIcon, Palette,
} from "lucide-react";

type PopupData = { enabled: boolean; title: string; content: string };

const COLORS = [
  "#ffffff", "#e8e8f0", "#94a3b8", "#64748b",
  "#0052ff", "#4d7cff", "#00c2ff", "#06b6d4",
  "#22c55e", "#84cc16", "#eab308", "#f97316",
  "#ef4444", "#ec4899", "#a855f7", "#8b5cf6",
];

function ToolbarBtn({ onClick, active, children, title }: {
  onClick: (e: React.MouseEvent) => void; active?: boolean; children: React.ReactNode; title?: string;
}) {
  return (
    <button type="button" title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(e); }}
      className={`rounded-lg p-1.5 transition hover:bg-primary/10 hover:text-primary ${active ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
      {children}
    </button>
  );
}

export function PopupManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Lưu selection trước khi mở color picker
  const savedSelectionRef = { current: null as { from: number; to: number } | null };

  const openColorPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    if (editor) {
      const { from, to } = editor.state.selection;
      savedSelectionRef.current = { from, to };
    }
    setShowColors(v => !v);
  };

  const applyColor = (e: React.MouseEvent, color: string | null) => {
    e.preventDefault();
    if (!editor) return;
    const sel = savedSelectionRef.current;
    if (sel) {
      editor.chain().focus().setTextSelection(sel).run();
    }
    if (color) {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().unsetColor().run();
    }
    setShowColors(false);
    savedSelectionRef.current = null;
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ horizontalRule: false, bulletList: {}, orderedList: {} }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline cursor-pointer" } }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "min-h-[220px] outline-none p-4 text-foreground text-sm leading-normal",
      },
    },
  });

  useEffect(() => {
    fetch("/api/admin/popup")
      .then((r) => r.json())
      .then((data: PopupData) => {
        setEnabled(data.enabled);
        setTitle(data.title);
        editor?.commands.setContent(data.content || "");
      })
      .catch(() => toast.error("Không thể tải cài đặt popup."))
      .finally(() => setLoading(false));
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!linkUrl.trim()) {
      editor?.chain().focus().unsetLink().run();
    } else {
      editor?.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setLinkUrl("");
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const onSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/popup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, title, content: editor?.getHTML() ?? "" }),
    });
    setSaving(false);
    res.ok ? toast.success("ĐÃ LƯU CÀI ĐẶT POP-UP.") : toast.error("LƯU THẤT BẠI.");
  };

  if (loading) return <LoadingSpinner className="py-12" label="ĐANG TẢI..." />;

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="glass-card flex items-center justify-between rounded-2xl p-4">
        <div>
          <p className="font-heading text-sm font-bold uppercase tracking-[0.1em] text-foreground">TRẠNG THÁI POP-UP</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabled ? "BẬT – SẼ HIỆN KHI VÀO TRANG CHỦ" : "TẮT – KHÔNG HIỆN CHO NGƯỜI DÙNG"}
          </p>
        </div>
        <button type="button" onClick={() => setEnabled(v => !v)}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}>
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      {/* Tiêu đề */}
      <div className="glass-card rounded-2xl p-4 space-y-2">
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">TIÊU ĐỀ POP-UP</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Nhập tiêu đề thông báo..." className="border-border bg-background text-foreground" />
      </div>

      {/* Editor */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-border px-3 py-2 flex flex-wrap gap-1 items-center">
          <ToolbarBtn title="In đậm" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}><Bold size={14} /></ToolbarBtn>
          <ToolbarBtn title="In nghiêng" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}><Italic size={14} /></ToolbarBtn>
          <ToolbarBtn title="Gạch chân" onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")}><UnderlineIcon size={14} /></ToolbarBtn>
          <span className="w-px h-4 bg-border mx-0.5" />
          <ToolbarBtn title="Tiêu đề 2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })}><Heading2 size={14} /></ToolbarBtn>
          <ToolbarBtn title="Tiêu đề 3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })}><Heading3 size={14} /></ToolbarBtn>
          <span className="w-px h-4 bg-border mx-0.5" />
          <ToolbarBtn title="Căn trái" onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })}><AlignLeft size={14} /></ToolbarBtn>
          <ToolbarBtn title="Căn giữa" onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })}><AlignCenter size={14} /></ToolbarBtn>
          <ToolbarBtn title="Căn phải" onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })}><AlignRight size={14} /></ToolbarBtn>
          <span className="w-px h-4 bg-border mx-0.5" />
          <ToolbarBtn title="Danh sách" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")}><List size={14} /></ToolbarBtn>
          <ToolbarBtn title="Danh sách số" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")}><ListOrdered size={14} /></ToolbarBtn>
          <span className="w-px h-4 bg-border mx-0.5" />
          {/* Link */}
          <ToolbarBtn title="Chèn link" onClick={() => setShowLinkInput(v => !v)} active={editor?.isActive("link") || showLinkInput}><LinkIcon size={14} /></ToolbarBtn>
          {/* Màu chữ */}
          <div className="relative">
            <ToolbarBtn title="Màu chữ" onClick={openColorPicker} active={showColors}><Palette size={14} /></ToolbarBtn>
            {showColors && (
              <div className="absolute top-8 left-0 z-20 rounded-xl border border-border bg-card p-2 shadow-xl grid grid-cols-8 gap-1 w-48">
                {COLORS.map((c) => (
                  <button key={c} type="button" title={c}
                    onMouseDown={(e) => applyColor(e, c)}
                    className="size-5 rounded-md border border-border/50 hover:scale-110 transition-transform"
                    style={{ background: c }} />
                ))}
                <button type="button" title="Xóa màu"
                  onMouseDown={(e) => applyColor(e, null)}
                  className="col-span-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground px-1 py-0.5">
                  Xóa màu
                </button>
              </div>
            )}
          </div>
          <span className="flex-1" />
          <ToolbarBtn title="Xem trước" onClick={() => setPreview(v => !v)} active={preview}>
            {preview ? <EyeOff size={14} /> : <Eye size={14} />}
          </ToolbarBtn>
        </div>

        {/* Link input */}
        {showLinkInput && (
          <div className="border-b border-border px-3 py-2 flex gap-2">
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..." className="h-8 text-sm border-border bg-background"
              onKeyDown={(e) => e.key === "Enter" && applyLink()} />
            <Button type="button" size="sm" onClick={applyLink} className="h-8 px-3 text-xs">Áp dụng</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowLinkInput(false)} className="h-8 px-3 text-xs">Hủy</Button>
          </div>
        )}

        {/* Content */}
        {preview ? (
          <div className="min-h-[220px] p-4 popup-content" dangerouslySetInnerHTML={{ __html: editor?.getHTML() ?? "" }} />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      <Button onClick={onSave} disabled={saving} className="w-full rounded-xl h-11 uppercase tracking-[0.08em] font-bold">
        <Save className="mr-2 size-4" />
        {saving ? "ĐANG LƯU..." : "LƯU CÀI ĐẶT POP-UP"}
      </Button>
    </div>
  );
}
