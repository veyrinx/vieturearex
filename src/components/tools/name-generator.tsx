"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Đổi a-z/A-Z/0-9 sang 1 dải Unicode liền mạch (offset). Ký tự khác giữ nguyên.
function offsetMap(s: string, up: number, low: number, digit?: number): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 65 && c <= 90) out += String.fromCodePoint(up + (c - 65));
    else if (c >= 97 && c <= 122) out += String.fromCodePoint(low + (c - 97));
    else if (digit != null && c >= 48 && c <= 57) out += String.fromCodePoint(digit + (c - 48));
    else out += ch;
  }
  return out;
}

// Kiểu chữ (dải liền mạch, không lỗ hổng → không bị ô vuông)
const FONT_STYLES: { label: string; fn: (s: string) => string }[] = [
  { label: "Đậm", fn: (s) => offsetMap(s, 0x1d5d4, 0x1d5ee, 0x1d7ec) },
  { label: "Nghiêng", fn: (s) => offsetMap(s, 0x1d608, 0x1d622) },
  { label: "Đậm nghiêng", fn: (s) => offsetMap(s, 0x1d63c, 0x1d656) },
  { label: "Serif đậm", fn: (s) => offsetMap(s, 0x1d400, 0x1d41a, 0x1d7ce) },
  { label: "Máy đánh chữ", fn: (s) => offsetMap(s, 0x1d670, 0x1d68a, 0x1d7f6) },
  { label: "Toàn rộng", fn: (s) => offsetMap(s, 0xff21, 0xff41, 0xff10) },
];

// Khung trang trí kiểu Free Fire
const DECOR: { label: string; fn: (s: string) => string }[] = [
  { label: "Hoàng gia", fn: (s) => `꧁༒${s}༒꧂` },
  { label: "Sát thủ", fn: (s) => `☆彡 ${s} 彡☆` },
  { label: "Súng ngắm", fn: (s) => `▄︻デ═一 ${s}` },
  { label: "Ngoặc vuông", fn: (s) => `【 ${s} 】` },
  { label: "Kiếm", fn: (s) => `╾━╤デ╦︻ ${s}` },
  { label: "Sao băng", fn: (s) => `✰ ${s} ✰` },
  { label: "Cánh", fn: (s) => `⊰᯽⊱┈▷ ${s} ◁┈⊰᯽⊱` },
  { label: "Góc nhọn", fn: (s) => `『 ${s} 』` },
];

function Row({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Đã copy — dán vào game nhé!");
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50"
    >
      <span className="min-w-0 flex-1 truncate text-lg text-foreground" style={{ fontFamily: "system-ui" }}>
        {text}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground group-hover:text-primary">
        {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
        {copied ? "Đã copy" : "Copy"}
      </span>
    </button>
  );
}

export function NameGenerator() {
  const [name, setName] = useState("");
  const q = name.trim();

  const results = useMemo(() => {
    if (!q) return [];
    const styled = FONT_STYLES.map((s) => s.fn(q));
    // Khung trang trí bọc bản đậm cho nổi
    const bold = offsetMap(q, 0x1d5d4, 0x1d5ee, 0x1d7ec);
    const decor = DECOR.map((d) => d.fn(bold));
    return [...styled, ...decor];
  }, [q]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Sparkles className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="Nhập tên của bạn..."
          className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          autoFocus
        />
      </div>

      {q ? (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {results.length} kiểu — bấm để copy
          </p>
          {results.map((r, i) => (
            <Row key={i} text={r} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Sparkles className="mx-auto mb-3 size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nhập tên để tạo hàng loạt kiểu chữ đẹp + khung trang trí.</p>
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground/70">
        Mẹo: một số ký tự đặc biệt có thể không hiển thị đúng trong Free Fire — thử vài kiểu để chọn cái vào game đẹp nhất.
      </p>
    </div>
  );
}
