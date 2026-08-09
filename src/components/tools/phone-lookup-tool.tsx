"use client";

import { useState } from "react";
import { Search, Loader2, Info, ChevronDown, ChevronUp, Copy, Check, Phone } from "lucide-react";
import { toast } from "sonner";

type PhoneLookupResponse = {
  engine?: string;
  raw?: {
    veriphone?: {
      carrier?: string;
      country?: string;
      country_code?: string;
      country_prefix?: string;
      e164?: string;
      geographical?: boolean;
      international_number?: string;
      local_number?: string;
      mode?: string;
      phone?: string;
      phone_region?: string;
      phone_type?: string;
      phone_valid?: boolean;
      status?: string;
      timezone?: string[];
    };
    vtp?: Record<string, unknown>;
  };
  summary?: {
    account_id?: string;
    carrier?: string;
    country?: string;
    owner?: string;
    owner_ascii?: string;
    phone?: string;
    phone_international?: string;
    phone_type?: string;
    uid?: string;
    uid_created?: string;
    valid?: boolean;
    viettel_status?: string;
  };
  error?: string;
};

export function PhoneLookupTool() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PhoneLookupResponse | null>(null);
  const [showRaw, setShowRaw] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawInput = phone.trim();
    if (!rawInput) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }

    // Tự động chuyển 033... thành 8433...
    let cleanNumber = rawInput.replace(/\D/g, "");
    if (cleanNumber.startsWith("0")) {
      cleanNumber = "84" + cleanNumber.slice(1);
    }

    if (!cleanNumber.startsWith("84")) {
      toast.error("Chỉ chấp nhận số Việt Nam bắt đầu bằng 84");
      return;
    }

    setLoading(true);
    setData(null);

    try {
      const res = await fetch(`/api/tools/phone-lookup?phone=${encodeURIComponent(cleanNumber)}`);
      const result: PhoneLookupResponse = await res.json();

      if (!res.ok || result.error) {
        toast.error(result.error || "Không tìm thấy thông tin số điện thoại");
      } else {
        setData(result);
        toast.success("Tra cứu thành công!");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRaw = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data.raw || data, null, 4));
      setCopied(true);
      toast.success("Đã copy dữ liệu RAW!");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Không copy được");
    }
  };

  const summary = data?.summary;
  const veriphone = data?.raw?.veriphone;

  const getFieldValue = (val?: string | null) => {
    if (!val || val === "N/A" || val.trim() === "") return "N/A";
    return val;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Thông báo quy định đầu số */}
      <div className="flex items-start gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/40 p-4 text-cyan-950 dark:text-cyan-100 shadow-sm">
        <Info className="size-5 shrink-0 text-cyan-600 dark:text-cyan-400 mt-0.5" />
        <div className="text-xs md:text-sm space-y-1">
          <p className="font-black text-cyan-900 dark:text-cyan-300">Thông báo tra cứu:</p>
          <p className="text-cyan-900 dark:text-cyan-200 font-semibold leading-relaxed">
            Chỉ chấp nhận số Việt Nam, có đầu{" "}
            <code className="font-mono bg-cyan-200/90 dark:bg-cyan-900/80 text-cyan-950 dark:text-cyan-100 px-1.5 py-0.5 rounded font-black">
              84
            </code>{" "}
            (ví dụ:{" "}
            <span className="font-mono font-black text-cyan-700 dark:text-cyan-300">84123456789</span>{" "}
            hoặc{" "}
            <span className="font-mono font-black text-cyan-700 dark:text-cyan-300">0123456789</span> - tự động quy đổi).
          </p>
        </div>
      </div>

      {/* Form tra cứu */}
      <form onSubmit={handleLookup} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-cyan-600 dark:text-cyan-400" />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập số điện thoại (VD: 84123456789)..."
              className="w-full rounded-2xl border border-cyan-500/30 bg-card py-3.5 pl-11 pr-4 font-mono text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-7 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-cyan-500 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {loading ? "Đang check..." : "Tra Cứu"}
          </button>
        </div>
      </form>

      {/* Kết quả Tra cứu */}
      {data && (
        <div className="space-y-6">
          {/* Card KẾT QUẢ TRA CỨU QUỐC TẾ */}
          <div className="rounded-3xl border border-cyan-500/30 bg-[#070a12] p-5 md:p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between border-b border-cyan-900/50 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Phone className="size-4 text-cyan-400" />
                </span>
                <h3 className="font-heading text-sm md:text-base font-black uppercase tracking-wider text-cyan-400">
                  KẾT QUẢ TRA CỨU QUỐC TẾ
                </h3>
              </div>
            </div>

            {/* Grid 12 items (2 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Row 1 */}
              <GridItem label="Số điện thoại" value={getFieldValue(summary?.phone || veriphone?.phone)} />
              <GridItem label="SĐT quốc tế" value={getFieldValue(summary?.phone_international || veriphone?.international_number)} />

              {/* Row 2 */}
              <GridItem label="Chủ tài khoản" value={getFieldValue(summary?.owner)} />
              <GridItem label="Tên không dấu" value={getFieldValue(summary?.owner_ascii)} />

              {/* Row 3 */}
              <GridItem label="Mã tài khoản" value={getFieldValue(summary?.account_id)} />
              <GridItem label="Trạng thái VT" value={getFieldValue(summary?.viettel_status)} />

              {/* Row 4 */}
              <GridItem label="Nhà mạng" value={getFieldValue(summary?.carrier || veriphone?.carrier)} />
              <GridItem label="Loại số" value={getFieldValue(summary?.phone_type || veriphone?.phone_type)} />

              {/* Row 5 */}
              <GridItem label="Quốc gia" value={getFieldValue(summary?.country || veriphone?.country)} />
              <GridItem label="UID" value={getFieldValue(summary?.uid)} />

              {/* Row 6 */}
              <GridItem label="Ngày tạo UID" value={getFieldValue(summary?.uid_created)} />
              <GridItem
                label="Xác thực"
                value={
                  summary?.valid || veriphone?.phone_valid ? (
                    <span className="text-emerald-400 font-black">Hợp lệ</span>
                  ) : (
                    <span className="text-rose-400 font-black">Không hợp lệ</span>
                  )
                }
              />
            </div>
          </div>

          {/* Card DATA RAW (FULL) */}
          <div className="rounded-3xl border border-cyan-500/30 bg-[#070a12] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between bg-cyan-950/40 px-5 py-4 border-b border-cyan-900/50">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-cyan-400 hover:text-cyan-300"
              >
                <span>DATA RAW (FULL)</span>
                {showRaw ? <ChevronUp className="size-4 text-cyan-400" /> : <ChevronDown className="size-4 text-cyan-400" />}
              </button>

              <button
                onClick={handleCopyRaw}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-700/60 bg-cyan-950/60 px-3.5 py-1.5 text-xs font-bold text-cyan-300 transition hover:bg-cyan-900 hover:text-white"
              >
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                {copied ? "Đã copy" : "Copy RAW"}
              </button>
            </div>

            {showRaw && (
              <div className="p-4 bg-[#03050a] overflow-x-auto">
                <pre className="font-mono text-xs text-cyan-300/90 leading-relaxed p-4 rounded-2xl bg-[#080c18] border border-cyan-950">
                  {JSON.stringify(data.raw || data, null, 4)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GridItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-cyan-900/50 bg-[#0f1422] px-4 py-3.5 text-sm">
      <span className="text-slate-300 font-semibold text-xs md:text-sm">{label}</span>
      <span className="font-mono font-black text-cyan-300 text-xs md:text-sm">{value}</span>
    </div>
  );
}
