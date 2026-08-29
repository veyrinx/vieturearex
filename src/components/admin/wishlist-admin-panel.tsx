"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check, FileUp, Loader2, LogOut, Lock, Plus, Search, ShieldCheck, Sparkles, Trash2, TriangleAlert,
} from "lucide-react";
import {
  WISHLIST_CAPACITY,
  WISHLIST_DAT_MAX_BYTES,
  WISHLIST_METHODS,
  WISHLIST_METHOD_LABEL,
  rarityLabel,
  rarityTone,
  vnDateTime,
  type WishlistItem,
  type WishlistMethod,
} from "@/lib/constants/ff-wishlist";
import { cn } from "@/lib/utils";

const INPUT =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60";
const LABEL = "mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground";
const BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50";

type Session = { session: string; uid: string; region: string | null; expires_at: string };

/** Tệp .dat → base64 để gửi kèm JSON (tệp guest chỉ vài KB, khỏi cần multipart). */
function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được tệp."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("Không đọc được tệp."));
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

function ItemTile({
  item,
  selected,
  badge,
  onClick,
}: {
  item: WishlistItem;
  selected?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
}) {
  const rare = rarityLabel(item.rarity);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-xl border border-border bg-card p-2 text-left transition",
        onClick && "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        selected && "border-primary/60 bg-primary/5",
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.icon} alt={item.name ?? item.id} loading="lazy" className="size-full object-contain" />
        {selected && (
          <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" />
          </span>
        )}
        {badge}
      </div>
      <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground">
        {item.name ?? `ID ${item.id}`}
      </p>
      <div className="flex items-center justify-between gap-1">
        <code className="font-mono text-[9px] text-muted-foreground">{item.id}</code>
        {rare && (
          <span className={cn("rounded-full border px-1.5 py-0.5 text-[8px] font-bold", rarityTone(item.rarity))}>
            {rare}
          </span>
        )}
      </div>
    </button>
  );
}

type Props = {
  /** Đăng nhập acc người chơi (capability wishlist.credentials). */
  canLogin: boolean;
  /** Thêm / bớt món (capability wishlist.manage). */
  canManage: boolean;
};

/**
 * Công cụ gắn danh sách mong muốn.
 *
 * Người trực dán acc của người chơi vào đây, HỆ THỐNG đăng nhập qua API rồi
 * thêm/bớt món theo ID vật phẩm — không ai phải mở game, và mật khẩu không đi
 * xuống DB. Chuỗi phiên chỉ nằm trong bộ nhớ trang này: tải lại trang là mất,
 * đúng như mong muốn.
 */
export function WishlistAdminPanel({ canLogin, canManage }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [corrupted, setCorrupted] = useState(false);
  const [busy, setBusy] = useState(false);

  // Đăng nhập
  const [method, setMethod] = useState<WishlistMethod>("dat");
  const [datFile, setDatFile] = useState<File | null>(null);
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");

  // Tìm & thêm
  const [q, setQ] = useState("");
  const [results, setResults] = useState<WishlistItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [toAdd, setToAdd] = useState<Set<string>>(new Set());
  const searchSeq = useRef(0);

  const ownedIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  // Gõ xong mới tìm — kho vật phẩm nằm ở máy chủ, đừng bắn mỗi ký tự một lượt.
  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setResults([]);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/ff-wishlist/items?q=${encodeURIComponent(needle)}`);
        const json = (await res.json()) as { items?: WishlistItem[] };
        if (seq === searchSeq.current) setResults(json.items ?? []);
      } catch {
        if (seq === searchSeq.current) setResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  const login = useCallback(async () => {
    if (method === "dat" && !datFile) return toast.error("Chọn tệp .dat.");
    if (method === "guest" && (!uid.trim() || !password)) return toast.error("Điền UID và mật khẩu.");
    if (datFile && datFile.size > WISHLIST_DAT_MAX_BYTES) return toast.error("Tệp .dat quá lớn.");

    setBusy(true);
    try {
      const payload: Record<string, unknown> = { method };
      if (method === "dat" && datFile) {
        payload.dat_name = datFile.name;
        payload.dat_b64 = await readAsBase64(datFile);
      } else {
        payload.uid = uid.trim();
        payload.password = password;
      }

      const res = await fetch("/api/admin/ff-wishlist/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        session?: string;
        uid?: string;
        region?: string | null;
        expires_at?: string;
        items?: WishlistItem[];
        corrupted?: boolean;
        warning?: string | null;
        error?: string;
      };
      if (!res.ok || !json.session) throw new Error(json.error ?? "Đăng nhập thất bại.");

      setSession({
        session: json.session,
        uid: json.uid ?? "",
        region: json.region ?? null,
        expires_at: json.expires_at ?? "",
      });
      setItems(json.items ?? []);
      setCorrupted(Boolean(json.corrupted));
      // Không giữ lại bản rõ trong bộ nhớ trang sau khi đã đổi được phiên.
      setPassword("");
      setDatFile(null);
      if (json.warning) toast.warning(json.warning);
      else toast.success(`Đã vào acc ${json.uid}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Đăng nhập thất bại.");
    } finally {
      setBusy(false);
    }
  }, [method, datFile, uid, password]);

  const refresh = useCallback(async (s: Session) => {
    const res = await fetch("/api/admin/ff-wishlist/list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session: s.session }),
    });
    const json = (await res.json()) as { items?: WishlistItem[]; corrupted?: boolean; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Không đọc được wishlist.");
    setItems(json.items ?? []);
    setCorrupted(Boolean(json.corrupted));
  }, []);

  const mutate = useCallback(
    async (body: { add?: string[]; remove?: string[] }) => {
      if (!session) return;
      setBusy(true);
      try {
        const res = await fetch("/api/admin/ff-wishlist/update", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session: session.session, ...body }),
        });
        const json = (await res.json()) as {
          added?: string[];
          removed?: string[];
          failed?: string[];
          items?: WishlistItem[];
          corrupted?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Không cập nhật được.");

        setItems(json.items ?? []);
        setCorrupted(Boolean(json.corrupted));
        setToAdd(new Set());

        const done = (json.added?.length ?? 0) + (json.removed?.length ?? 0);
        if (json.failed?.length) toast.warning(`Xong ${done} món, lỗi ${json.failed.length} món.`);
        else toast.success(`Xong ${done} món.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Không cập nhật được.");
      } finally {
        setBusy(false);
      }
    },
    [session],
  );

  if (!canLogin && !session) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center">
        <Lock className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Vai của bạn xem được công cụ nhưng không được cấp quyền đăng nhập acc người chơi. Cần thì
          nhờ super admin bật <code className="rounded bg-muted px-1">wishlist.credentials</code>.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-heading text-xl font-black uppercase tracking-tight text-foreground">
          <Sparkles className="size-5 text-primary" />
          Danh sách mong muốn
        </h1>
        <p className="text-xs text-muted-foreground">
          Hệ thống tự đăng nhập acc rồi gắn món theo ID — người trực không phải mở game, mật khẩu
          không được lưu lại ở đâu.
        </p>
      </header>

      {!session ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <p className="text-xs text-muted-foreground">
              Tệp .dat và mật khẩu chỉ đi qua máy chủ đúng một lần để lấy phiên, không ghi xuống cơ
              sở dữ liệu. Phiên hết hạn sau 2 giờ, tải lại trang là mất.
            </p>
          </div>

          <div>
            <label className={LABEL}>Cách vào acc — chọn một</label>
            <div className="flex gap-2">
              {WISHLIST_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                    method === m
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {WISHLIST_METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          {method === "dat" ? (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 transition hover:border-primary/40">
              <FileUp className="size-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {datFile ? datFile.name : "Chọn tệp .dat của tài khoản khách"}
              </span>
              <input
                type="file"
                accept=".dat,application/octet-stream"
                className="hidden"
                onChange={(e) => setDatFile(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL}>UID khách</label>
                <input value={uid} onChange={(e) => setUid(e.target.value)} className={INPUT} autoComplete="off" />
              </div>
              <div>
                <label className={LABEL}>Mật khẩu khách</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT}
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={login}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Đăng nhập acc
          </button>
        </div>
      ) : (
        <>
          {/* ── Acc đang mở ── */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                UID {session.uid}{" "}
                {session.region && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {session.region}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Phiên hết hạn {vnDateTime(session.expires_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {items.length}/{WISHLIST_CAPACITY}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void refresh(session).catch((e: Error) => toast.error(e.message));
                }}
                className={BTN}
              >
                Tải lại
              </button>
              <button
                type="button"
                onClick={() => {
                  setSession(null);
                  setItems([]);
                  setToAdd(new Set());
                }}
                className={BTN}
              >
                <LogOut className="size-3.5" /> Thoát acc
              </button>
            </div>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
              style={{ width: `${Math.min(100, (items.length / WISHLIST_CAPACITY) * 100)}%` }}
            />
          </div>

          {corrupted && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <TriangleAlert className="size-4 shrink-0" />
              Wishlist của acc này có món lỗi — gỡ ra rồi gắn lại nếu game không nhận.
            </div>
          )}

          {/* ── Wishlist hiện tại ── */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Đang có trong wishlist
            </h2>
            {items.length === 0 ? (
              <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Wishlist đang trống.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
                {items.map((it) => (
                  <ItemTile
                    key={it.id}
                    item={it}
                    badge={
                      canManage ? (
                        <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-md bg-red-500/90 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                          <Trash2 className="size-3" /> GỠ
                        </span>
                      ) : undefined
                    }
                    onClick={canManage && !busy ? () => mutate({ remove: [it.id] }) : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Thêm món ── */}
          {canManage && (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Thêm món theo ID hoặc tên
              </h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="VD: 211000000 hoặc Cobra"
                  className={cn(INPUT, "pl-9")}
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {results.length > 0 && (
                <>
                  <div className="grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5 lg:grid-cols-7">
                    {results.map((it) => {
                      const owned = ownedIds.has(it.id);
                      return (
                        <ItemTile
                          key={it.id}
                          item={it}
                          selected={toAdd.has(it.id)}
                          badge={
                            owned ? (
                              <span className="absolute inset-x-1 bottom-1 rounded-md bg-emerald-500/90 py-0.5 text-center text-[9px] font-bold text-white">
                                ĐÃ CÓ
                              </span>
                            ) : undefined
                          }
                          onClick={
                            owned || busy
                              ? undefined
                              : () =>
                                  setToAdd((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(it.id)) next.delete(it.id);
                                    else next.add(it.id);
                                    return next;
                                  })
                          }
                        />
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={busy || toAdd.size === 0}
                    onClick={() => mutate({ add: [...toAdd] })}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Thêm {toAdd.size > 0 ? `${toAdd.size} món` : ""}
                  </button>
                </>
              )}

              {q.trim().length >= 2 && !searching && results.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">Không tìm thấy món nào.</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
