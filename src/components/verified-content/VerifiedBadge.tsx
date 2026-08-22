"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Clock, ShieldAlert } from "lucide-react";
import type { PublicVerificationInfo, VerificationStatus } from "@/lib/types/verified-content";

interface VerifiedBadgeProps {
  info?: PublicVerificationInfo | null;
  status?: VerificationStatus;
  showPillStatus?: boolean; // If true, shows status pill even if not VERIFIED (useful for admin/creator dashboards)
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  info,
  status: directStatus,
  showPillStatus = false,
  className = "",
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const status = info?.status ?? directStatus ?? "UNVERIFIED";
  const isActive = info?.is_verified_active ?? (status === "VERIFIED");

  // Condition from Spec: When status == VERIFIED AND current time <= verification_expires_at
  if (isActive && status === "VERIFIED") {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <div
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-all hover:scale-105 cursor-pointer select-none"
          role="status"
          aria-label="Arex Verified Content"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>✓ Arex Verified</span>
        </div>

        {/* Tooltip Contract: "Nội dung này đã được đội ngũ Arex Network kiểm tra và xác minh." */}
        {showTooltip && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 min-w-[260px] p-3 rounded-xl bg-gray-950/95 border border-emerald-500/40 text-gray-100 text-xs shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-300">Arex Network Verification</p>
                <p className="mt-1 text-gray-300 leading-relaxed">
                  Nội dung này đã được đội ngũ Arex Network kiểm tra và xác minh.
                </p>
                {info?.verified_at && (
                  <p className="mt-1.5 text-[10px] text-gray-400 border-t border-gray-800 pt-1">
                    Ngày duyệt: {new Date(info.verified_at).toLocaleDateString("vi-VN")}
                  </p>
                )}
                {info?.verification_expires_at && (
                  <p className="text-[10px] text-amber-400/80">
                    Thời hạn: {new Date(info.verification_expires_at).toLocaleDateString("vi-VN")}
                  </p>
                )}
                {info?.content_hash && (
                  <p className="text-[9px] text-gray-500 font-mono mt-0.5 truncate">
                    Hash: {info.content_hash.slice(0, 16)}...
                  </p>
                )}
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-950" />
          </div>
        )}
      </div>
    );
  }

  if (!showPillStatus) {
    return null;
  }

  // Optional status pill badges for PENDING / REJECTED / EXPIRED (Dashboard views)
  switch (status) {
    case "PENDING":
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 ${className}`}>
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span>Chờ xác minh</span>
        </span>
      );
    case "EXPIRED":
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30 ${className}`}>
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Hết hạn xác minh</span>
        </span>
      );
    case "REJECTED":
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30 ${className}`}>
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Từ chối xác minh</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700 ${className}`}>
          <span>Chưa xác minh</span>
        </span>
      );
  }
};
