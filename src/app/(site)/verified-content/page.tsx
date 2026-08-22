"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Plus, Search, RefreshCw, AlertCircle } from "lucide-react";
import { VerifiedContentCard } from "@/components/verified-content/VerifiedContentCard";
import { VerifiedContentEditorModal } from "@/components/verified-content/VerifiedContentEditorModal";
import type { VerifiedContentItem, VerificationStatus } from "@/lib/types/verified-content";

export default function VerifiedContentPage() {
  const [items, setItems] = useState<VerifiedContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"ALL" | VerificationStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<VerifiedContentItem | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    fetchUserSession();
    fetchContents();
  }, [selectedTab]);

  const fetchUserSession = async () => {
    try {
      const res = await fetch("/api/user/profile");
      const json = await res.json();
      if (json.success && json.data) {
        setCurrentUserId(json.data.id);
        const role = json.data.role;
        setIsModerator(["super_admin", "admin", "it"].includes(role || ""));
      }
    } catch {
      // User might be guest
    }
  };

  const fetchContents = async () => {
    setIsLoading(true);
    try {
      let url = "/api/verified-content?limit=50";
      if (selectedTab !== "ALL") {
        url += `&status=${selectedTab}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load contents", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.content_body.toLowerCase().includes(q) ||
      (item.author_name && item.author_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Banner */}
        <div className="relative p-8 rounded-3xl bg-card border border-border overflow-hidden shadow-sm space-y-4">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> Arex Network Trust & Safety
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Verified Content — Xác Minh & Bảo Vệ Nội Dung
            </h1>
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Hệ thống xác minh nội dung chính thức của Arex Network. Phân biệt rõ ràng giữa thông tin đã được đội ngũ kiểm tra độc lập với nội dung cộng đồng tự do đăng tải, cam kết bảo vệ dữ liệu bằng cơ chế <strong>Khóa cứng (Immutable)</strong> và <strong>Lưu vết vô cực (Append-Only Audit Trail)</strong>.
            </p>
          </div>
        </div>

        {/* Filter Controls & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-muted/50 rounded-xl border border-border">
            {[
              { key: "ALL", label: "Tất cả" },
              { key: "VERIFIED", label: "✓ Arex Verified" },
              { key: "PENDING", label: "Chờ duyệt" },
              { key: "REJECTED", label: "Từ chối" },
              { key: "EXPIRED", label: "Hết hạn" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedTab(key as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedTab === key
                    ? "bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search & Add button */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm nội dung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setItemToEdit(null);
                setIsEditorOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng Content</span>
            </button>
          </div>
        </div>

        {/* Content Feed Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            <span className="text-xs font-medium">Đang tải danh sách Verified Content...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-3xl border border-border space-y-3">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold text-foreground">Không tìm thấy nội dung</h3>
            <p className="text-xs text-muted-foreground">Chưa có bài đăng nào trong danh mục này hoặc khớp từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredItems.map((item) => (
              <VerifiedContentCard
                key={item.id}
                item={item}
                currentUserId={currentUserId}
                isModerator={isModerator}
                onRefresh={fetchContents}
                onEdit={(it) => {
                  setItemToEdit(it);
                  setIsEditorOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <VerifiedContentEditorModal
        isOpen={isEditorOpen}
        initialData={itemToEdit}
        onClose={() => setIsEditorOpen(false)}
        onSaved={fetchContents}
      />
    </div>
  );
}
