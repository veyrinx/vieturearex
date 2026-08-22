"use client";

import React, { useEffect, useState } from "react";
import { History, Shield, Globe, User, Clock, FileCode, CheckCircle2 } from "lucide-react";
import type { ContentAuditLogItem, AuditAction } from "@/lib/types/verified-content";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && contentId) {
      fetchLogs();
    }
  }, [isOpen, contentId]);

  const fetchLogs = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/verified-content/${contentId}/audit-logs`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể tải lịch sử audit trail");
      }
      setLogs(json.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi kết nối khi lấy audit log");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case "CREATE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">TẠO MỚI (CREATE)</span>;
      case "UPDATE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">CẬP NHẬT (UPDATE)</span>;
      case "SUBMIT_VERIFY":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">GỬI VERIFY (SUBMIT)</span>;
      case "VERIFY":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">ĐÃ DUYỆT (VERIFY)</span>;
      case "REJECT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">TỪ CHỐI (REJECT)</span>;
      case "EXPIRE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">HẾT HẠN (EXPIRE)</span>;
      case "SOFT_DELETE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300 border border-gray-600">XÓA MỀM (SOFT_DELETE)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400">{action}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-gray-900 border-l border-gray-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                Audit Trail — Lưu Vết Vô Cực
              </h3>
              <p className="text-xs text-emerald-400/90 flex items-center gap-1 font-mono">
                <Shield className="w-3 h-3" /> Append-Only (Cấm UPDATE / DELETE DB)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Đang tải nhật ký vết audit...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              Chưa có nhật ký ghi vết cho nội dung này.
            </div>
          ) : (
            <div className="relative border-l border-gray-800 ml-3 pl-6 space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative group">
                  {/* Timeline node */}
                  <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-4 border-gray-900 group-hover:scale-125 transition-transform" />

                  <div className="p-4 rounded-xl bg-gray-950/70 border border-gray-800/80 space-y-2.5 hover:border-gray-700 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {getActionBadge(log.action)}
                      </div>
                      <span className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString("vi-VN")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 border-t border-gray-800/60 pt-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                        <span className="font-medium text-gray-200">{log.actor_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end font-mono text-[10px] text-gray-400">
                        <Globe className="w-3 h-3 text-gray-500" />
                        <span>IP: {log.ip_address || "N/A"}</span>
                      </div>
                    </div>

                    {/* Data Snapshot diff */}
                    {(log.old_data || log.new_data) && (
                      <div className="mt-2 space-y-1.5">
                        <div className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                          <FileCode className="w-3 h-3 text-emerald-400" /> Snapshot JSON Payload:
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-[10px] font-mono">
                          {log.old_data && (
                            <div className="p-2 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300 overflow-x-auto">
                              <span className="font-bold text-rose-400">Old Data:</span>
                              <pre>{JSON.stringify(log.old_data, null, 2)}</pre>
                            </div>
                          )}
                          {log.new_data && (
                            <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 overflow-x-auto">
                              <span className="font-bold text-emerald-400">New Data:</span>
                              <pre>{JSON.stringify(log.new_data, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-gray-800 bg-gray-950 text-center">
          <p className="text-[11px] text-gray-500 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Arex Network Immutable Content Audit Standard v1.0
          </p>
        </div>
      </div>
    </div>
  );
};
