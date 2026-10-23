"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, RefreshCw, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = { name: string; inDb: boolean; onHost: boolean };
type Payload = { groups: Array<{ title: string; names: string[] }>; status: Status[] };

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Biến môi trường lưu trong DB (bảng app_env). Không bao giờ hiện lại giá trị. */
export function EnvConfigPanel() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await fetch("/api/admin/env").catch(() => null);
    const body = (await r?.json().catch(() => null)) as (Payload & { error?: string }) | null;
    if (!r?.ok || !body) { setError(body?.error ?? "Không tải được."); return; }
    setData(body);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (name: string, value: string) => {
    setBusy(name);
    try {
      const r = await fetch("/api/admin/env", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, value }),
      });
      const body = (await r.json().catch(() => null)) as { error?: string } | null;
      if (!r.ok) { toast.error(body?.error ?? "Lỗi không xác định."); return; }
      toast.success(value ? `Đã lưu ${name}.` : `Đã xoá ${name}.`);
      setDrafts((d) => ({ ...d, [name]: "" }));
      await load();
    } catch {
      toast.error("Lỗi mạng.");
    } finally {
      setBusy(null);
    }
  };

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-destructive">{error}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()} className="gap-1.5">
          <RefreshCw className="size-3.5" /> Thử lại
        </Button>
      </div>
    );
  }
  if (!data) return <p className="text-xs text-muted-foreground">Đang tải...</p>;

  const byName = new Map(data.status.map((s) => [s.name, s]));
  return (
    <div className="space-y-5">
      {data.groups.map((group) => (
        <div key={group.title} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{group.title}</p>
          {group.names.map((name) => {
            const s = byName.get(name);
            const draft = drafts[name] ?? "";
            return (
              <div key={name} className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-2 sm:w-72">
                  <KeyRound className="size-3.5 shrink-0 text-muted-foreground" />
                  <code className="truncate text-xs font-semibold">{name}</code>
                  {s?.onHost ? (
                    <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600" title="Biến trên Vercel được ưu tiên hơn DB. Xoá nó khỏi Vercel để DB tiếp quản.">Vercel</span>
                  ) : s?.inDb ? (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">DB</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Chưa đặt</span>
                  )}
                </div>
                <Input
                  type="password"
                  autoComplete="off"
                  value={draft}
                  placeholder={s?.inDb ? "•••••• (nhập để thay)" : "Giá trị"}
                  onChange={(e) => setDrafts((d) => ({ ...d, [name]: e.target.value }))}
                  className="h-8 flex-1 text-xs"
                />
                <div className="flex shrink-0 gap-1.5">
                  {/SECRET/.test(name) && (
                    <Button type="button" size="sm" variant="outline" title="Tạo chuỗi ngẫu nhiên" onClick={() => setDrafts((d) => ({ ...d, [name]: randomSecret() }))} className="h-8 px-2">
                      <Shuffle className="size-3.5" />
                    </Button>
                  )}
                  <Button type="button" size="sm" disabled={!draft || busy === name} onClick={() => void save(name, draft)} className="h-8">
                    Lưu
                  </Button>
                  {s?.inDb && (
                    <Button type="button" size="sm" variant="outline" title="Xoá khỏi DB" disabled={busy === name} onClick={() => void save(name, "")} className="h-8 px-2">
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
