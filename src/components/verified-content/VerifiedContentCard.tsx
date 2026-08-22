"use client";

import React, { useState } from "react";
import { VerifiedBadge } from "./VerifiedBadge";
import { ShieldCheck, History, Edit3, Trash2, Send, Hash, Calendar, User } from "lucide-react";
import type { VerifiedContentItem } from "@/lib/types/verified-content";
import { ModeratorVerifyDialog } from "./ModeratorVerifyDialog";
import { AuditTrailDrawer } from "./AuditTrailDrawer";

interface VerifiedContentCardProps {
  item: VerifiedContentItem;
  currentUserId?: string;
  isModerator?: boolean;
  onRefresh?: () => void;
  onEdit?: (item: VerifiedContentItem) => void;
}

export const VerifiedContentCard: React.FC<VerifiedContentCardProps> = ({
  item,
  currentUserId,
  isModerator = false,
  onRefresh,
  onEdit,
}) => {
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOwner = currentUserId === item.user_id;

  const handleSubmitVerification = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/verified-content/${item.id}/submit`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gửi yêu cầu thất bại");
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi khi gửi xác minh");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa nội dung này? (Hệ thống sẽ thực hiện Xóa mềm - Soft Delete để lưu vết)")) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/verified-content/${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Xóa thất bại");
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || "Lỗi khi xóa nội dung");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="p-5 rounded-2xl bg-gray-900/90 border border-gray-800 hover:border-gray-700/80 shadow-xl transition-all space-y-4">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-sm">
              {item.author_avatar ? (
                <img src={item.author_avatar} alt="Author" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-200">{item.author_name || "Thành viên Arex"}</h4>
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-600" />
                {new Date(item.created_at).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <VerifiedBadge info={item.verification_info} status={item.verification_status} showPillStatus={true} />
          </div>
        </div>

        {/* Card Content Body */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-gray-100">{item.title}</h3>
          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line bg-gray-950/60 p-3.5 rounded-xl border border-gray-800/80">
            {item.content_body}
          </p>
        </div>

        {/* Metadata & SHA-256 Hash */}
        {item.verification_info?.content_hash && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-950/90 border border-gray-800 text-[10px] font-mono text-gray-400">
            <Hash className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">SHA-256 Hash: {item.verification_info.content_hash}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Card Action Bar */}
        <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAuditDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white transition-all text-xs font-medium"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Audit Trail</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Submit for verification button */}
            {(isOwner || isModerator) &&
              (item.verification_status === "UNVERIFIED" ||
                item.verification_status === "REJECTED" ||
                item.verification_status === "EXPIRED") && (
                <button
                  onClick={handleSubmitVerification}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all font-semibold"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi xác minh</span>
                </button>
              )}

            {/* Moderator Verify Action Button */}
            {isModerator && item.verification_status === "PENDING" && (
              <button
                onClick={() => setIsVerifyDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold shadow-lg shadow-emerald-500/20 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Duyệt Xác Minh</span>
              </button>
            )}

            {/* Edit Button */}
            {(isOwner || isModerator) && onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Sửa</span>
              </button>
            )}

            {/* Soft Delete Button */}
            {(isOwner || isModerator) && (
              <button
                onClick={handleSoftDelete}
                disabled={isSubmitting}
                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all"
                title="Xóa mềm (Soft Delete)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Moderator Verification Modal */}
      <ModeratorVerifyDialog
        contentId={item.id}
        contentTitle={item.title}
        contentBody={item.content_body}
        isOpen={isVerifyDialogOpen}
        onClose={() => setIsVerifyDialogOpen(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* Append-Only Audit Trail Drawer */}
      <AuditTrailDrawer
        contentId={item.id}
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
      />
    </>
  );
};
