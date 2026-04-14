"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { vi } from "date-fns/locale";
import { ShieldCheck } from "lucide-react";
import { useAdminLogsQuery } from "@/hooks/use-admin-logs-query";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";

export function ActivityLogsPanel() {
  const { data: logs = [], isLoading } = useAdminLogsQuery();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.08em] text-foreground">
          NHẬT KÝ HOẠT ĐỘNG 48H
        </h1>
        <p className="text-sm text-muted-foreground">
          LƯU CÁC HOẠT ĐỘNG CHÍNH CỦA TRANG ADMIN TRONG 48 GIỜ GẦN NHẤT, SAU ĐÓ TỰ ĐỘNG XÓA.
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-10" label="ĐANG TẢI NHẬT KÝ HỆ THỐNG..." />
      ) : logs.length === 0 ? (
        <EmptyState
          title="CHƯA CÓ BẢN GHI NHẬT KÝ"
          description="CÁC HOẠT ĐỘNG QUẢN TRỊ MỚI SẼ XUẤT HIỆN Ở ĐÂY TRONG VÒNG 48 GIỜ."
        />
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">THỜI GIAN</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">TÀI KHOẢN</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">HÀNH ĐỘNG</th>
                  <th className="px-4 py-3 uppercase tracking-[0.08em]">CHI TIẾT</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item.id} className="border-t border-border text-foreground align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <p>{new Date(item.created_at).toLocaleString("vi-VN")}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNowStrict(new Date(item.created_at), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.actor_email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary dark:text-amber-300">
                        <ShieldCheck className="size-3.5" />
                        {item.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p>{item.summary}</p>
                        <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                          {item.target_type}
                          {item.target_id ? ` / ${item.target_id}` : ""}
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
