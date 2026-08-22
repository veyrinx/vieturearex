"use client";

import React, { useState } from "react";
import { ShieldCheck, CheckSquare, Square, AlertCircle, X, Check, XCircle } from "lucide-react";

interface ModeratorVerifyDialogProps {
  contentId: string;
  contentTitle: string;
  contentBody: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModeratorVerifyDialog: React.FC<ModeratorVerifyDialogProps> = ({
  contentId,
  contentTitle,
  contentBody,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [checklist, setChecklist] = useState({
    sourceVerified: false,
    accuracyVerified: false,
    updatedVerified: false,
    noTamperVerified: false,
    policyCompliant: false,
  });

  const [verificationSource, setVerificationSource] = useState("");
  const [verificationNote, setVerificationNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const allChecked = Object.values(checklist).every(Boolean);

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDecision = async (decision: "VERIFY" | "REJECT") => {
    if (decision === "VERIFY" && !allChecked) {
      setErrorMsg("Bạn phải hoàn thành đủ 5 bước kiểm duyệt bắt buộc trước khi phê duyệt VERIFIED.");
      return;
    }
    if (decision === "VERIFY" && !verificationSource.trim()) {
      setErrorMsg("Vui lòng nhập nguồn thông tin xác minh (Verification Source).");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/verified-content/${contentId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          verification_source: verificationSource.trim() || undefined,
          verification_note: verificationNote.trim() || undefined,
          verification_expires_at: expiresAt || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Xử lý thất bại");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi hệ thống");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5 text-foreground animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">QUY TRÌNH KIỂM DUYỆT VERIFIED CONTENT</h3>
              <p className="text-xs text-muted-foreground">Arex Network Verification Protocol & Safety Standards</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-1 text-xs">
          <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px]">Đang kiểm duyệt:</span>
          <p className="font-semibold text-foreground">{contentTitle}</p>
          <p className="text-muted-foreground line-clamp-2 italic">"{contentBody}"</p>
        </div>

        {/* 5-Point Checklist */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-emerald-500" />
            Checklist 5 Bước Kiểm Duyệt Bắt Buộc:
          </h4>

          <div className="grid grid-cols-1 gap-2.5 text-xs">
            {[
              { key: "sourceVerified" as const, label: "1. Kiểm tra Nguồn thông tin (Verification Source chính thống, rõ ràng)" },
              { key: "accuracyVerified" as const, label: "2. Kiểm tra Độ chính xác (Đã đối chiếu với tài liệu/dữ liệu Arex)" },
              { key: "updatedVerified" as const, label: "3. Kiểm tra Thời điểm cập nhật (Nội dung mới nhất, không lỗi thời)" },
              { key: "noTamperVerified" as const, label: "4. Kiểm tra Dấu hiệu bất thường (Không có mã độc, link lạ, sai lệch)" },
              { key: "policyCompliant" as const, label: "5. Kiểm tra Quy định Arex Network (Tuân thủ Điều khoản & Tiêu chuẩn)" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleCheck(key)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  checklist[key]
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                    : "border-border bg-card text-muted-foreground hover:border-emerald-500/30"
                }`}
              >
                {checklist[key] ? (
                  <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 shrink-0" />
                )}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Nguồn thông tin xác minh (Verification Source) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Arex Official Announcement #2026, Thông cáo báo chí, ..."
              value={verificationSource}
              onChange={(e) => setVerificationSource(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Ghi chú kiểm duyệt nội bộ (Verification Note - Ẩn công khai)
              </label>
              <textarea
                rows={2}
                placeholder="Lý do duyệt / từ chối, bằng chứng đối chiếu..."
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Ngày hết hạn xác minh (Để trống nếu vĩnh viễn)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Footer Decision Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => handleDecision("REJECT")}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold transition-all"
          >
            <XCircle className="w-4 h-4" />
            <span>TỪ CHỐI (REJECT)</span>
          </button>

          <button
            type="button"
            onClick={() => handleDecision("VERIFY")}
            disabled={isSubmitting || !allChecked}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all ${
              allChecked
                ? "bg-emerald-500 hover:bg-emerald-400 text-gray-950 shadow-emerald-500/20 cursor-pointer"
                : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60"
            }`}
          >
            <Check className="w-4 h-4" />
            <span>XÁC MINH (VERIFY)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
