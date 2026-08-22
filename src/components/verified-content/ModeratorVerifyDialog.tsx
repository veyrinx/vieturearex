"use client";

import React, { useState } from "react";
import { ShieldCheck, ShieldX, AlertTriangle, CheckSquare, Square, FileText, Calendar, Link as LinkIcon, Lock } from "lucide-react";
import type { ModeratorVerificationChecklist } from "@/lib/types/verified-content";

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
  const [checklist, setChecklist] = useState<ModeratorVerificationChecklist>({
    sourceChecked: false,
    accuracyChecked: false,
    updatedTimeChecked: false,
    integrityChecked: false,
    complianceChecked: false,
  });

  const [verificationSource, setVerificationSource] = useState("");
  const [verificationNote, setVerificationNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const allChecklistPassed =
    checklist.sourceChecked &&
    checklist.accuracyChecked &&
    checklist.updatedTimeChecked &&
    checklist.integrityChecked &&
    checklist.complianceChecked;

  const handleToggleCheck = (key: keyof ModeratorVerificationChecklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDecision = async (decision: "VERIFY" | "REJECT") => {
    if (decision === "VERIFY" && !allChecklistPassed) {
      setErrorMsg("Vui lòng hoàn thành 5 bước kiểm tra quy trình trước khi duyệt VERIFIED!");
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
          verification_expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Thao tác thất bại");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi khi duyệt xác minh");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-100">Quy trình Kiểm duyệt Content — Arex Moderator</h3>
              <p className="text-xs text-gray-400">Kiểm tra các tiêu chuẩn an toàn và tính chính xác trước khi duyệt badge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl font-bold p-1 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800">
            <h4 className="text-sm font-semibold text-amber-400">{contentTitle}</h4>
            <p className="mt-1 text-xs text-gray-300 line-clamp-3 font-mono bg-gray-900/60 p-2.5 rounded-lg border border-gray-800/60">
              {contentBody}
            </p>
          </div>

          {/* Section 3 Checklist Mandate */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4" /> Checklist Moderator Bắt buộc (Mục 3 Spec):
            </h4>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                { key: "sourceChecked", label: "1. Kiểm tra Nguồn thông tin (Verification Source có căn cứ rõ ràng)" },
                { key: "accuracyChecked", label: "2. Kiểm tra Độ chính xác của dữ liệu / tuyên bố" },
                { key: "updatedTimeChecked", label: "3. Kiểm tra Thời điểm cập nhật (Thông tin mới, không bị cũ/lạc hậu)" },
                { key: "integrityChecked", label: "4. Kiểm tra Nội dung có dấu hiệu bị chỉnh sửa hay bất thường không" },
                { key: "complianceChecked", label: "5. Kiểm tra Không vi phạm bất kỳ quy định nào của Arex Network" },
              ].map(({ key, label }) => {
                const checked = checklist[key as keyof ModeratorVerificationChecklist];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleCheck(key as keyof ModeratorVerificationChecklist)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      checked
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium"
                        : "bg-gray-950/50 border-gray-800 text-gray-400 hover:border-gray-700"
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Input Fields */}
          <div className="space-y-4 pt-2 border-t border-gray-800/80">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-emerald-400" /> Nguồn đối chiếu kiểm chứng (Verification Source)
              </label>
              <input
                type="text"
                placeholder="VD: https://official-announcement.com hoặc Tài liệu nội bộ #104"
                value={verificationSource}
                onChange={(e) => setVerificationSource(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Ngày hết hạn xác minh (verification_expires_at)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Để trống nếu xác minh vô thời hạn. Sau ngày này, trạng thái sẽ tự chuyển sang EXPIRED.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-400" /> Ghi chú nội bộ Moderator (verification_note - BẢO MẬT)
              </label>
              <textarea
                rows={3}
                placeholder="Ghi chú thẩm định dành riêng cho Admin/Moderator. Tuyệt đối không hiển thị công khai cho user."
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleDecision("REJECT")}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all disabled:opacity-50"
          >
            <ShieldX className="w-4 h-4" /> Từ chối (REJECT)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:bg-gray-800 transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => handleDecision("VERIFY")}
              disabled={isSubmitting || !allChecklistPassed}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-gray-950 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" /> Duyệt Xác Minh (VERIFIED)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
