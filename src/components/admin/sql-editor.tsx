"use client";

import { useState } from "react";
import { Database, Play, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function SqlEditor() {
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleExecute() {
    const query = sql.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: query }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Lỗi không xác định.");
        return;
      }
      const rows: Record<string, unknown>[] = Array.isArray(json.data) ? json.data : [];
      setResult(rows);
      toast.success(`Thực thi thành công — ${rows.length} hàng`);
    } catch {
      setError("Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  const columns = result && result.length > 0 ? Object.keys(result[0]) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10">
          <Database className="size-5 text-violet-500" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">SQL Editor</h1>
          <p className="text-xs text-muted-foreground">Thực thi truy vấn SQL trực tiếp trên cơ sở dữ liệu</p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex gap-3">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div className="space-y-2 text-xs text-amber-600 dark:text-amber-400">
            <p className="font-semibold">Yêu cầu hàm Postgres <code className="rounded bg-amber-500/15 px-1">exec_sql</code></p>
            <p>
              Báo lỗi không tìm thấy hàm thì mở{" "}
              <code className="rounded bg-amber-500/15 px-1">supabase/migration-exec-sql.sql</code>{" "}
              trong repo, dán vào Supabase SQL Editor và chạy một lần.
            </p>
            <p>
              Đừng chép bản <code className="rounded bg-amber-500/15 px-1">SECURITY DEFINER</code> hay
              gặp trên mạng: thiếu lệnh thu hồi quyền là mọi khách vãng lai đều gọi được RPC này và
              chạy SQL tuỳ ý. Bản trong repo chạy bằng quyền người gọi và chỉ mở cho service_role.
            </p>
            <p>
              Câu không phải SELECT vẫn chạy, kết quả trả về một hàng tóm tắt gồm loại câu lệnh và
              số hàng bị đụng tới.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Textarea
          className="min-h-[160px] font-mono text-sm"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="SELECT id, email, role FROM users ORDER BY created_at DESC LIMIT 20;"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleExecute();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">Ctrl+Enter để thực thi</p>
          <Button onClick={handleExecute} disabled={loading || !sql.trim()} size="sm" className="gap-2">
            <Play className="size-3.5" />
            {loading ? "Đang chạy..." : "Thực thi"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
            <p className="font-mono text-xs text-red-500">{error}</p>
          </div>
        </div>
      )}

      {result !== null && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{result.length} hàng trả về</p>
          {columns.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {columns.map((col) => (
                      <th key={col} className="px-3 py-2 text-left font-semibold text-muted-foreground">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.map((row, i) => (
                    <tr key={i} className={cn("border-b border-border/50 last:border-0", i % 2 !== 0 && "bg-muted/20")}>
                      {columns.map((col) => (
                        <td key={col} className="max-w-[300px] truncate px-3 py-2 font-mono">
                          {row[col] === null ? (
                            <span className="text-muted-foreground/40">NULL</span>
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Truy vấn thực thi thành công nhưng không trả về dữ liệu.</p>
          )}
        </div>
      )}
    </div>
  );
}
