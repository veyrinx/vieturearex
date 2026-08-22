"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Clock, CheckCircle2, AlertTriangle, History, RefreshCw, FileText, Lock } from "lucide-react";
import { VerifiedContentCard } from "@/components/verified-content/VerifiedContentCard";
import type { VerifiedContentItem } from "@/lib/types/verified-content";

export default function AdminVerifiedContentPage() {
  const [items, setItems] = useState<VerifiedContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("PENDING");

  useEffect(() => {
    fetchContents();
  }, [filterStatus]);

  const fetchContents = async () => {
    setIsLoading(true);
    try {
      let url = "/api/verified-content?limit=100";
      if (filterStatus !== "ALL") {
        url += `&status=${filterStatus}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load admin verified content queue", err);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = items.filter((i) => i.verification_status === "PENDING").length;
  const verifiedCount = items.filter((i) => i.verification_status === "VERIFIED").length;

  return (
    <div className="space-y-8 p-6 bg-gray-950 text-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            Quản Lý Verified Content — Arex Network Moderator
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Trung tâm kiểm duyệt & lưu vết toàn bộ (Audit Trail) tuân thủ quy tắc <strong>"Không Sửa — Không Xóa"</strong>.
          </p>
        </div>

        <button
          onClick={fetchContents}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs font-semibold text-gray-300 hover:bg-gray-800 transition-all"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${isLoading ? "animate-spin" : ""}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Hàng chờ duyệt (PENDING)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-400">{pendingCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Đã xác minh (VERIFIED)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{verifiedCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Bảo vệ Soft Delete</span>
            <Lock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xs text-blue-300 font-medium mt-1">Cấm hard DELETE DB</p>
        </div>

        <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Append-Only Audit</span>
            <History className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xs text-purple-300 font-medium mt-1">Ghi log mọi thao tác</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-gray-900 border border-gray-800 overflow-x-auto">
        {[
          { key: "PENDING", label: "Chờ kiểm duyệt (PENDING)" },
          { key: "ALL", label: "Tất cả nội dung" },
          { key: "VERIFIED", label: "Đã duyệt (VERIFIED)" },
          { key: "REJECTED", label: "Đã từ chối (REJECTED)" },
          { key: "EXPIRED", label: "Hết hạn (EXPIRED)" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === key
                ? "bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-xs">Đang tải hàng chờ kiểm duyệt...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-gray-900/40 rounded-2xl border border-gray-800 text-gray-400 text-xs">
          Không có bài đăng nào cần duyệt trong mục này.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => (
            <VerifiedContentCard
              key={item.id}
              item={item}
              isModerator={true}
              onRefresh={fetchContents}
            />
          ))}
        </div>
      )}
    </div>
  );
}
