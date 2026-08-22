"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, FileText, Send, CheckCircle2, ShieldAlert } from "lucide-react";
import type { VerifiedContentItem } from "@/lib/types/verified-content";

interface VerifiedContentEditorModalProps {
  isOpen: boolean;
  itemToEdit?: VerifiedContentItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const VerifiedContentEditorModal: React.FC<VerifiedContentEditorModalProps> = ({
  isOpen,
  itemToEdit,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [contentBody, setContentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (itemToEdit) {
      setTitle(itemToEdit.title);
      setContentBody(itemToEdit.content_body);
    } else {
      setTitle("");
      setContentBody("");
    }
    setErrorMsg(null);
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const isEditingVerified = itemToEdit && itemToEdit.verification_status === "VERIFIED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !contentBody.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ tiêu đề và nội dung.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const url = itemToEdit
        ? `/api/verified-content/${itemToEdit.id}`
        : "/api/verified-content";
      const method = itemToEdit ? "PUT" : "POST";

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
        throw new Error(json.error || "Thao tác thất bại");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi khi lưu nội dung");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">
                {itemToEdit ? "Chỉnh Sửa Nội Dung Verified Content" : "Tạo Nội Dung Mới"}
              </h3>
              <p className="text-xs text-gray-400">Hệ thống quản lý xác minh & lưu vết toàn bộ (Audit Trail)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-lg font-bold p-1 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isEditingVerified && (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200">Quy định Khóa cứng Nội dung (Mục 4 Spec):</p>
                <p className="mt-0.5 leading-relaxed text-amber-300/90">
                  Nội dung này hiện đang ở trạng thái <strong className="text-emerald-400">VERIFIED</strong>. Lưu thay đổi sẽ tự động hạ trạng thái về <strong className="text-amber-400">UNVERIFIED</strong> và yêu cầu kiểm duyệt lại từ đầu (PENDING → VERIFIED) để chống gian lận.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Tiêu đề nội dung *
            </label>
            <input
              type="text"
              required
              placeholder="Nhập tiêu đề thông tin hoặc bài đăng..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Nội dung chi tiết (content_body) *
            </label>
            <textarea
              required
              rows={6}
              placeholder="Nhập nội dung văn bản / dữ liệu cần kiểm chứng..."
              value={contentBody}
              onChange={(e) => setContentBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-100 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:bg-gray-800 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-gray-950 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Đang lưu..." : itemToEdit ? "Cập Nhật & Hạ Trạng Thái" : "Tạo Mới Content"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
