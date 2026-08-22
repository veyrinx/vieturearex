"use client";

import React, { useEffect, useState } from "react";
import { X, Save, ShieldAlert } from "lucide-react";
import type { VerifiedContentItem } from "@/lib/types/verified-content";

interface VerifiedContentEditorModalProps {
  isOpen: boolean;
  initialData?: VerifiedContentItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export const VerifiedContentEditorModal: React.FC<VerifiedContentEditorModalProps> = ({
  isOpen,
  initialData,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState("");
  const [contentBody, setContentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContentBody(initialData.content_body);
    } else {
      setTitle("");
      setContentBody("");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const isEditing = Boolean(initialData);
  const isVerified = initialData?.verification_status === "VERIFIED";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !contentBody.trim()) {
      setErrorMsg("Vui lòng nhập tiêu đề và nội dung.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const url = isEditing
        ? `/api/verified-content/${initialData!.id}`
        : "/api/verified-content";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content_body: contentBody.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Lưu thất bại");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi hệ thống");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-4 text-foreground animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">
            {isEditing ? "CHỈNH SỬA NỘI DUNG" : "TẠO NỘI DUNG MỚI"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner if Editing VERIFIED Content */}
        {isVerified && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">CẢNH BÁO QUY TẮC IMMUTABLE:</p>
              <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
                Nội dung này hiện tại đang đạt trạng thái <strong>VERIFIED</strong>. Nếu bạn chỉnh sửa nội dung, hệ thống sẽ <strong>TỰ ĐỘNG CHUYỂN VỀ UNVERIFIED</strong> để yêu cầu kiểm duyệt lại từ đầu!
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Tiêu đề bài đăng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nhập tiêu đề..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Nội dung chính <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={6}
              placeholder="Nhập nội dung bài đăng..."
              value={contentBody}
              onChange={(e) => setContentBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 resize-y"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Đang lưu..." : "Lưu Bài Đăng"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
