"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Shield, ShieldOff, ShieldAlert, RefreshCw, Trash2,
  Plus, Clock, AlertTriangle, CheckCircle2, Lock, ListChecks, X,
  Eye, Globe, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { vi } from "date-fns/locale";

type BlockedEntry = { ip: string; blockedAt: number; reason: string };
type VisitorEntry = { ip: string; lastPath: string; ua: string; lastSeen: number; count: number };
type Tab = "visitors" | "blocked" | "whitelist";

function isValidIp(ip: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || /^[0-9a-f:]{3,39}$/.test(ip);
}

function timeAgo(ts: number) {
  try { return formatDistanceToNowStrict(new Date(ts), { locale: vi, addSuffix: true }); }
  catch { return "vừa xong"; }
}

function blockedUntil(blockedAt: number) {
  return new Date(blockedAt + 60 * 60 * 1000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function shortenUa(ua: string) {
  // Try to extract browser/OS from UA string
  if (!ua) return "—";
  const chrome = ua.match(/Chrome\/(\d+)/);
  const firefox = ua.match(/Firefox\/(\d+)/);
  const safari = ua.match(/Version\/[\d.]+ Safari/);
  const edge = ua.match(/Edg\/(\d+)/);
  const bot = /bot|crawl|spider|slurp|baidu|bing/i.test(ua);
  if (bot) return "Bot";
  if (edge) return `Edge ${edge[1]}`;
  if (chrome) return `Chrome ${chrome[1]}`;
  if (firefox) return `Firefox ${firefox[1]}`;
  if (safari) return "Safari";
  return ua.slice(0, 40);
}

export function SecurityPanel() {
  const [tab, setTab] = useState<Tab>("visitors");
  const [blocked, setBlocked] = useState<BlockedEntry[]>([]);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [banningIp, setBanningIp] = useState<string | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [wlNewIp, setWlNewIp] = useState("");
  const [wlAdding, setWlAdding] = useState(false);
  const [wlRemoving, setWlRemoving] = useState<string | null>(null);
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [visitorSearch, setVisitorSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security");
      if (res.ok) {
        const d = (await res.json()) as { blocked: BlockedEntry[]; whitelist?: string[]; visitors?: VisitorEntry[] };
        setBlocked(d.blocked ?? []);
        setWhitelist(d.whitelist ?? []);
        setVisitors(d.visitors ?? []);
      }
    } catch { toast.error("Không thể tải dữ liệu bảo mật."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    // Detect actual client IP via public API for whitelist suggestions
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d: { ip: string }) => setClientIp(d.ip))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, []);

  const blockIp = async (ip: string, reason = "Chặn thủ công bởi admin") => {
    setBanningIp(ip);
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, reason }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Đã chặn IP: ${ip}`);
      await load();
    } catch { toast.error("Không thể chặn IP."); }
    finally { setBanningIp(null); }
  };

  const unblock = async (ip: string) => {
    setUnblocking(ip);
    try {
      const res = await fetch("/api/admin/security", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Đã mở chặn IP: ${ip}`);
      await load();
    } catch { toast.error("Không thể mở chặn IP."); }
    finally { setUnblocking(null); }
  };

  const wlAdd = async (ip: string) => {
    if (!isValidIp(ip)) { toast.error("IP không hợp lệ."); return; }
    setWlAdding(true);
    try {
      const res = await fetch("/api/admin/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", ip }),
      });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as { whitelist: string[] };
      setWhitelist(d.whitelist);
      setWlNewIp("");
      toast.success(`Đã thêm IP: ${ip} vào danh sách trắng.`);
    } catch { toast.error("Không thể thêm IP."); }
    finally { setWlAdding(false); }
  };

  const wlRemove = async (ip: string) => {
    setWlRemoving(ip);
    try {
      const res = await fetch("/api/admin/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", ip }),
      });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as { whitelist: string[] };
      setWhitelist(d.whitelist);
      toast.success(`Đã xóa IP: ${ip} khỏi danh sách trắng.`);
    } catch { toast.error("Không thể xóa IP."); }
    finally { setWlRemoving(null); }
  };

  const addBlock = async () => {
    if (!newIp.trim()) { toast.error("Nhập địa chỉ IP."); return; }
    setAdding(true);
    await blockIp(newIp.trim(), newReason.trim() || "Chặn thủ công");
    setNewIp(""); setNewReason("");
    setAdding(false);
  };

  const blockedIpSet = new Set(blocked.map((b) => b.ip));
  const filteredVisitors = visitorSearch
    ? visitors.filter((v) => v.ip.includes(visitorSearch) || v.lastPath.includes(visitorSearch) || v.ua.toLowerCase().includes(visitorSearch.toLowerCase()))
    : visitors;

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "visitors", label: "Nhật ký truy cập", count: visitors.length },
    { id: "blocked", label: "IP bị chặn", count: blocked.length },
    { id: "whitelist", label: "Danh sách trắng", count: whitelist.length },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10">
            <ShieldAlert className="size-5 text-red-500" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold uppercase tracking-[0.06em] text-foreground">Bảo Mật Hệ Thống</h1>
            <p className="text-xs text-muted-foreground">Theo dõi IP truy cập · Chặn / mở chặn · Danh sách trắng admin</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5 rounded-xl">
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Làm mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Eye, label: "IP đã theo dõi", value: visitors.length, color: "text-blue-500 bg-blue-500/10" },
          { icon: Lock, label: "Đang bị chặn", value: blocked.length, color: "text-red-500 bg-red-500/10" },
          { icon: AlertTriangle, label: "Tự động chặn", value: blocked.filter(b => b.reason.includes("lần")).length, color: "text-amber-500 bg-amber-500/10" },
          { icon: CheckCircle2, label: "Chặn thủ công", value: blocked.filter(b => !b.reason.includes("lần")).length, color: "text-purple-500 bg-purple-500/10" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card flex items-center gap-3 rounded-2xl p-4">
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", color)}>
              <Icon className="size-4" />
            </div>
            <div>
              <p className="text-xl font-black text-foreground">{value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-border pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative -mb-px flex items-center gap-1.5 rounded-t-xl border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition-colors",
              tab === t.id
                ? "border-primary text-primary dark:text-amber-400 dark:border-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {(t.count ?? 0) > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                tab === t.id ? "bg-primary/15 text-primary dark:bg-amber-400/15 dark:text-amber-400" : "bg-muted text-muted-foreground",
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Visitor Log ──────────────────────────────────────────── */}
      {tab === "visitors" && (
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-3">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-blue-500" />
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Tất cả IP đã truy cập ({visitors.length})
              </h2>
            </div>
            <Input
              value={visitorSearch}
              onChange={(e) => setVisitorSearch(e.target.value)}
              placeholder="Tìm IP, đường dẫn, trình duyệt..."
              className="h-8 w-56 text-xs"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVisitors.length === 0 ? (
            <div className="py-16 text-center">
              <Eye className="mx-auto mb-3 size-10 text-muted-foreground/30" />
              <p className="text-sm font-semibold text-foreground">Chưa có dữ liệu</p>
              <p className="mt-1 text-xs text-muted-foreground">IP sẽ được ghi lại tự động khi có người truy cập trang.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.08em]">Địa chỉ IP</th>
                    <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.08em]">Trang cuối</th>
                    <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.08em]">Trình duyệt</th>
                    <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.08em]">Lần cuối</th>
                    <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.08em]">Lượt</th>
                    <th className="px-4 py-2.5 font-semibold uppercase tracking-[0.08em]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredVisitors.map((v) => {
                    const isBanned = blockedIpSet.has(v.ip);
                    return (
                      <tr key={v.ip} className={cn("transition-colors hover:bg-muted/30", isBanned && "bg-red-500/5")}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-bold text-foreground">{v.ip}</code>
                            {isBanned && (
                              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-500">BAN</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="max-w-[160px] truncate block font-mono">{v.lastPath}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{shortenUa(v.ua)}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{timeAgo(v.lastSeen)}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{v.count}</td>
                        <td className="px-4 py-3">
                          {isBanned ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={unblocking === v.ip}
                              onClick={() => unblock(v.ip)}
                              className="h-7 gap-1 rounded-lg border-green-500/30 px-2 text-[11px] text-green-600 hover:bg-green-500/10 dark:text-green-400"
                            >
                              <CheckCircle2 className="size-3" />
                              {unblocking === v.ip ? "..." : "Mở"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={banningIp === v.ip}
                              onClick={() => blockIp(v.ip, "Chặn thủ công từ nhật ký truy cập")}
                              className="h-7 gap-1 rounded-lg border-red-500/30 px-2 text-[11px] text-red-500 hover:bg-red-500/10"
                            >
                              <Ban className="size-3" />
                              {banningIp === v.ip ? "..." : "Ban"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Blocked IPs ─────────────────────────────────────────── */}
      {tab === "blocked" && (
        <div className="space-y-4">
          {/* Manual block form */}
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="size-4 text-muted-foreground" />
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Chặn IP thủ công</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addBlock(); }}
                placeholder="192.168.1.1"
                className="h-9 w-44 font-mono text-sm"
              />
              <Input
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Lý do (tuỳ chọn)..."
                className="h-9 flex-1 min-w-44 text-sm"
              />
              <Button size="sm" onClick={addBlock} disabled={adding || !newIp.trim()} className="gap-1.5 rounded-xl">
                <Shield className="size-3.5" />
                {adding ? "Đang chặn..." : "Chặn IP"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">IP bị chặn sẽ không thể truy cập bất kỳ trang nào trong 1 giờ.</p>
          </div>

          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="border-b border-border bg-muted/50 px-5 py-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                IP đang bị chặn ({blocked.length})
              </h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : blocked.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="mx-auto mb-3 size-10 text-green-500/40" />
                <p className="text-sm font-semibold text-foreground">Không có IP nào bị chặn</p>
                <p className="mt-1 text-xs text-muted-foreground">Hệ thống đang hoạt động bình thường.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {blocked.map((entry) => (
                  <div key={entry.ip} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                      <ShieldOff className="size-4 text-red-500" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="font-mono text-sm font-bold text-foreground">{entry.ip}</code>
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                          <Lock className="size-2.5" /> Bị chặn
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{entry.reason}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
                        <span className="flex items-center gap-1"><Clock className="size-2.5" /> {timeAgo(entry.blockedAt)}</span>
                        <span>Hết hạn lúc: {blockedUntil(entry.blockedAt)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={unblocking === entry.ip}
                      onClick={() => unblock(entry.ip)}
                      className="gap-1.5 rounded-xl border-green-500/30 text-green-600 hover:bg-green-500/10 dark:text-green-400 shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                      {unblocking === entry.ip ? "Đang mở..." : "Mở chặn"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Lưu ý</p>
            </div>
            <ul className="space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
              <li>IP bị chặn tự động sau <strong>5 lần đăng nhập sai</strong> trong vòng 15 phút.</li>
              <li>Thời gian chặn: <strong>1 giờ</strong>. Admin có thể mở sớm hơn.</li>
              <li>IP bị chặn không thể truy cập <strong>bất kỳ trang nào</strong> trên website.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── TAB: Whitelist ───────────────────────────────────────────── */}
      {tab === "whitelist" && (
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 text-green-500" />
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                IP được phép truy cập Admin
              </h2>
            </div>
            {whitelist.length > 0 && (
              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:text-green-400">
                {whitelist.length} IP
              </span>
            )}
          </div>

          {clientIp && (
            <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
              <Shield className="size-3.5 shrink-0 text-blue-500" />
              <p className="flex-1 text-xs text-blue-600 dark:text-blue-400">
                IP hiện tại của bạn: <code className="font-mono font-bold">{clientIp}</code>
              </p>
              {!whitelist.includes(clientIp) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => wlAdd(clientIp)}
                  disabled={wlAdding}
                  className="h-7 gap-1 rounded-lg border-green-500/30 px-2 text-[11px] text-green-600 hover:bg-green-500/10 dark:text-green-400"
                >
                  <Plus className="size-3" /> Thêm
                </Button>
              ) : (
                <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">✓ Đã có</span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={wlNewIp}
              onChange={(e) => setWlNewIp(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") wlAdd(wlNewIp.trim()); }}
              placeholder="Nhập IP thủ công (vd: 1.2.3.4)"
              className="h-9 flex-1 font-mono text-sm"
            />
            <Button
              size="sm"
              onClick={() => wlAdd(wlNewIp.trim())}
              disabled={wlAdding || !wlNewIp.trim()}
              className="gap-1.5 rounded-xl"
            >
              <Plus className="size-3.5" />
              {wlAdding ? "Đang thêm..." : "Thêm IP"}
            </Button>
          </div>

          {whitelist.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 py-4 text-center">
              <p className="text-xs font-semibold text-muted-foreground">Chưa có IP nào trong danh sách trắng</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Khi danh sách trống, tất cả IP đều được phép truy cập admin.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {whitelist.map((ip) => (
                <div key={ip} className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2">
                  <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />
                  <code className="flex-1 font-mono text-sm font-semibold text-foreground">{ip}</code>
                  {clientIp && ip === clientIp && (
                    <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-500">IP của bạn</span>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={wlRemoving === ip}
                    onClick={() => wlRemove(ip)}
                    className="size-6 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Nếu danh sách có IP, chỉ IP trong đây mới được phép truy cập <code>/admin</code>. IP khác sẽ bị chuyển hướng về trang chủ.
          </p>
        </div>
      )}
    </div>
  );
}
