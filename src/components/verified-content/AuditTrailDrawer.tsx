"use client";

import React, { useEffect, useState } from "react";
import { History, X, RefreshCw, User, Calendar, ShieldCheck, Lock } from "lucide-react";
import type { ContentAuditLogItem } from "@/lib/types/verified-content";

interface AuditTrailDrawerProps {
  contentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTrailDrawer: React.FC<AuditTrailDrawerProps> = ({
  contentId,
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<ContentAuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && contentId) {
      fetchLogs();
    }
  }, [isOpen, contentId]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/verified-content/${contentId}/audit-logs`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load audit trail logs", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const actionColorMap: Record<string, string> = {
    CREATE: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    UPDATE: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    SUBMIT_VERIFY: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    VERIFY: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    REJECT: "border-rose-500/30 bg-rose-500/10 text-rose-500",
    EXPIRE: "border-gray-500/30 bg-gray-500/10 text-gray-500",
    SOFT_DELETE: "border-rose-500/30 bg-rose-500/10 text-rose-500 font-bold",
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md h-full border-l border-border bg-card shadow-2xl flex flex-col text-foreground animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                <span>NHẬT KÝ AUDIT TRAIL</span>
                <span title="Append-Only SQL Locked"><Lock className="w-3.5 h-3.5 text-emerald-500" /></span>
              </h3>
              <p className="text-[11px] text-muted-foreground">Lưu vết không thể sửa/xóa (Append-Only Log)</p>
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

        {/* Drawer Body - Log Timeline */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
              <span className="text-xs">Đang tải nhật ký...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              Chưa có dữ liệu audit log cho nội dung này.
            </div>
          ) : (
            <div className="relative border-l-2 border-border ml-3 space-y-6 pl-4">
              {logs.map((log) => (
                <div key={log.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-card bg-purple-500 ring-2 ring-purple-500/20" />

                  <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-muted/40 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase font-bold tracking-wider ${actionColorMap[log.action] || "border-border text-muted-foreground"}`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString("vi-VN")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-foreground font-semibold">
                      <User className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{log.actor_name || "Thành viên / Hệ thống"}</span>
                    </div>

                    {log.ip_address && (
                      <p className="text-[10px] text-muted-foreground font-mono">IP: {log.ip_address}</p>
                    )}

                    {/* Snapshots */}
                    {(log.new_data || log.old_data) && (
                      <details className="mt-2 text-[10px]">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-mono">
                          Chi tiết Snapshot (JSON)
                        </summary>
                        <pre className="mt-1 p-2 rounded-lg bg-card border border-border text-[9px] font-mono overflow-x-auto text-muted-foreground">
                          {JSON.stringify({ old: log.old_data, new: log.new_data }, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-border bg-muted/20 text-[10px] text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Bảng content_audit_logs được bảo vệ tuyệt đối ở mức Database SQL level.</span>
        </div>
      </div>
    </div>
  );
};
