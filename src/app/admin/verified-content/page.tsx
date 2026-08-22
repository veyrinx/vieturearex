"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Clock, CheckCircle2, History, RefreshCw, Lock } from "lucide-react";
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
    <div className="space-y-6 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-[0.08em] text-foreground flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            QUẢN LÝ VERIFIED CONTENT — AREX NETWORK MODERATOR
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chỉ dành riêng cho <strong>Kỹ thuật (IT)</strong>, <strong>Admin</strong> và <strong>Super Admin</strong>. Trung tâm kiểm duyệt & lưu vết tuân thủ quy tắc <strong>"Không Sửa — Không Xóa"</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchContents}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-accent transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-500 ${isLoading ? "animate-spin" : ""}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Hàng chờ duyệt (PENDING)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-500">{pendingCount}</p>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Đã xác minh (VERIFIED)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-500">{verifiedCount}</p>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Bảo vệ Soft Delete</span>
            <Lock className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-1">Cấm hard DELETE DB</p>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Append-Only Audit</span>
            <History className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-1">Ghi log mọi thao tác</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-border bg-card overflow-x-auto">
        {[
          { key: "PENDING", label: "Chờ kiểm duyệt (PENDING)" },
          { key: "ALL", label: "Tất cả nội dung" },
          { key: "VERIFIED", label: "Đã duyệt (VERIFIED)" },
          { key: "REJECTED", label: "Đã từ chối (REJECTED)" },
          { key: "EXPIRED", label: "Hết hạn (EXPIRED)" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterStatus(key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === key
                ? "bg-emerald-500 text-gray-950 font-bold shadow-md shadow-emerald-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="text-xs font-medium">Đang tải hàng chờ kiểm duyệt...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-border bg-card text-muted-foreground text-xs font-medium">
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
