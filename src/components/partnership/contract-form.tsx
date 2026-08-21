"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Building2, CheckCircle2, FileSignature, Loader2,
  ScrollText, ShieldCheck, User, Copy, ExternalLink,
} from "lucide-react";
import { PARTNER_TIERS, TIER_LABEL } from "@/lib/constants/partners";
import { PACKAGE_BENEFITS, PACKAGE_FEE_NOTE, PACKAGE_TAGLINE } from "@/lib/constants/partnership";
import {
  ageFrom, buildContractDocument, EMPTY_CONTRACT_INPUT, isMinor,
  PARTY_TYPES, PARTY_TYPE_LABEL,
  type ContractInput, type PartyA,
} from "@/lib/constants/partnership-contract";
import { ContractDocumentView } from "@/components/partnership/contract-document";
import { SignaturePad } from "@/components/partnership/signature-pad";
import { cn } from "@/lib/utils";

const INPUT =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const AREA =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const LABEL = "text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

const STEPS = [
  { title: "Nội dung hợp tác", icon: ScrollText },
  { title: "Thông tin Bên B", icon: User },
  { title: "Đọc hợp đồng", icon: FileSignature },
  { title: "Ký & gửi", icon: ShieldCheck },
];

function Field({
  label, children, hint, required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className={LABEL}>
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

const todayVN = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

function addMonths(iso: string, months: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function PartnershipContractForm({ partyA }: { partyA: PartyA }) {
  const today = todayVN();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ContractInput>({
    ...EMPTY_CONTRACT_INPUT,
    term_start: today,
    term_end: addMonths(today, 6),
  });
  const [signature, setSignature] = useState("");
  const [signedName, setSignedName] = useState("");
  const [consents, setConsents] = useState({ terms: false, privacy: false, esign: false });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ code: string; url: string } | null>(null);

  const set = <K extends keyof ContractInput>(key: K, value: ContractInput[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const org = data.party_type === "organization";
  const age = ageFrom(data.date_of_birth);
  const minor = isMinor(data.date_of_birth);

  const doc = useMemo(
    () => buildContractDocument(data, partyA, { code: "(cấp khi gửi)", signDate: today }),
    [data, partyA, today],
  );

  // ── Điều kiện đi tiếp từng bước ────────────────────────────────────────────
  const errors: string[] = [];
  if (step === 0) {
    if (data.scope.trim().length < 20) errors.push("Mô tả nội dung hợp tác tối thiểu 20 ký tự.");
    if (!data.term_start || !data.term_end) errors.push("Chọn thời hạn hợp tác.");
    else if (data.term_end <= data.term_start) errors.push("Ngày kết thúc phải sau ngày bắt đầu.");
  }
  if (step === 1) {
    if (data.full_name.trim().length < 2) errors.push("Điền họ tên người ký.");
    if (!data.date_of_birth) errors.push("Điền ngày sinh của người ký.");
    else if (age === null) errors.push("Ngày sinh không hợp lệ.");
    if (data.id_number.trim().length < 6) errors.push("Điền số CCCD hoặc hộ chiếu.");
    if (data.address.trim().length < 5) errors.push("Điền địa chỉ liên hệ.");
    if (data.phone.trim().length < 8) errors.push("Điền số điện thoại.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email.trim())) errors.push("Email không hợp lệ.");
    if (org && !data.org_name.trim()) errors.push("Điền tên tổ chức.");
    if (minor) {
      if (!data.guardian_name.trim()) errors.push("Chưa đủ 18 tuổi — điền họ tên người đại diện theo pháp luật.");
      if (!data.guardian_relation.trim()) errors.push("Điền quan hệ của người đại diện với người ký.");
      if (!data.guardian_id_number.trim()) errors.push("Điền số CCCD của người đại diện.");
      if (!data.guardian_phone.trim()) errors.push("Điền số điện thoại người đại diện.");
    }
  }
  if (step === 3) {
    if (!signature) errors.push("Chưa ký vào ô chữ ký.");
    if (signedName.trim().toLowerCase().replace(/\s+/g, " ") !== data.full_name.trim().toLowerCase().replace(/\s+/g, " "))
      errors.push("Họ tên xác nhận phải trùng khớp với họ tên đã khai ở bước 2.");
    if (!consents.terms || !consents.privacy || !consents.esign) errors.push("Phải tích đủ ba ô xác nhận.");
  }

  const blocked = errors.length > 0;

  async function submit() {
    if (blocked) {
      toast.error(errors[0]);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/partnership/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          b_signature: signature,
          b_signed_name: signedName.trim(),
          consent_terms: true,
          consent_privacy: true,
          consent_esign: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Gửi hợp đồng thất bại.");
        return;
      }
      setDone({ code: json.code, url: json.url });
      toast.success("Đã gửi hợp đồng. Arex sẽ ký trong tối đa 3 ngày làm việc.");
    } catch {
      toast.error("Lỗi mạng. Thử lại giúp mình.");
    } finally {
      setSending(false);
    }
  }

  // ── Đã gửi xong ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-6 text-center md:p-10">
        <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
        <h2 className="mt-3 font-heading text-xl font-black uppercase tracking-tight text-foreground">
          Đã gửi hợp đồng
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Số hợp đồng <strong className="text-foreground">{done.code}</strong>. Bên B đã ký. Arex sẽ thẩm định và ký
          trong tối đa 03 ngày làm việc, kết quả gửi về email <strong className="text-foreground">{data.email}</strong>.
        </p>

        <div className="mx-auto mt-5 max-w-xl rounded-xl border border-border bg-card p-4 text-left">
          <p className={LABEL}>Liên kết xem hợp đồng của bạn</p>
          <p className="mt-1 break-all font-mono text-[11px] text-foreground">{done.url}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Lưu lại liên kết này — đây là bản hợp đồng điện tử riêng của bạn, đừng chia sẻ cho người khác.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(done.url);
                toast.success("Đã sao chép liên kết.");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Copy className="size-3.5" /> Sao chép
            </button>
            <Link
              href={done.url}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
            >
              <ExternalLink className="size-3.5" /> Mở hợp đồng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Thanh bước */}
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const state = i === step ? "current" : i < step ? "done" : "todo";
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors",
                  state === "current" && "border-primary/50 bg-primary/[0.06]",
                  state === "done" && "border-emerald-500/40 bg-emerald-500/[0.05]",
                  state === "todo" && "border-border opacity-60",
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    state === "current" && "text-primary dark:text-amber-400",
                    state === "done" && "text-emerald-500",
                    state === "todo" && "text-muted-foreground",
                  )}
                />
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                  {s.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* ── Bước 1: nội dung hợp tác ─────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <span className={LABEL}>Gói hợp tác *</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {PARTNER_TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("tier", t)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    data.tier === t ? "border-primary/60 bg-primary/[0.06]" : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="font-heading text-sm font-black uppercase tracking-tight text-foreground">
                    {TIER_LABEL[t]}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{PACKAGE_TAGLINE[t]}</p>
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-primary dark:text-amber-400">
                    {PACKAGE_FEE_NOTE[t]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
            <p className={LABEL}>Quyền lợi ghi vào Điều 3 của hợp đồng</p>
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              {PACKAGE_BENEFITS[data.tier].map((b) => (
                <li key={b} className="flex gap-1.5">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <Field
            label="Nội dung hợp tác cụ thể"
            required
            hint="Mô tả rõ hai bên làm gì cho nhau — nội dung này ghi thẳng vào khoản 1.2 của hợp đồng."
          >
            <textarea
              rows={4}
              value={data.scope}
              onChange={(e) => set("scope", e.target.value)}
              placeholder="Ví dụ: Bên B tài trợ 5.000.000đ tiền thưởng cho giải đấu Arex Cup mùa 3; Bên A đặt logo Bên B trên ảnh bìa giải và đăng 2 bài giới thiệu."
              className={AREA}
            />
          </Field>

          <Field label="Kênh / nền tảng của bạn" hint="Fanpage, TikTok, YouTube, nhóm Zalo/Discord… mỗi dòng một link.">
            <textarea
              rows={2}
              value={data.channels}
              onChange={(e) => set("channels", e.target.value)}
              placeholder="https://facebook.com/... , https://tiktok.com/@..."
              className={AREA}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bắt đầu hợp tác" required>
              <input type="date" value={data.term_start} onChange={(e) => set("term_start", e.target.value)} className={INPUT} />
            </Field>
            <Field label="Kết thúc hợp tác" required>
              <input type="date" value={data.term_end} onChange={(e) => set("term_end", e.target.value)} className={INPUT} />
            </Field>
          </div>

          <Field
            label="Giá trị hợp tác"
            hint="Để trống nếu hai bên chỉ trao đổi quyền lợi, không có tiền — hợp đồng sẽ ghi đúng như vậy."
          >
            <input
              value={data.consideration}
              onChange={(e) => set("consideration", e.target.value)}
              placeholder="Ví dụ: 5.000.000 VNĐ tiền thưởng + 10 mã quà tặng"
              className={INPUT}
            />
          </Field>

          <Field label="Phương thức & tiến độ thanh toán" hint="Chỉ điền khi có phát sinh thanh toán.">
            <input
              value={data.payment_terms}
              onChange={(e) => set("payment_terms", e.target.value)}
              placeholder="Ví dụ: chuyển khoản 100% trước ngày khai mạc 07 ngày"
              className={INPUT}
            />
          </Field>
        </div>
      )}

      {/* ── Bước 2: thông tin Bên B ──────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <span className={LABEL}>Bên B là *</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {PARTY_TYPES.map((t) => {
                const Icon = t === "organization" ? Building2 : User;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("party_type", t)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-3 text-left transition-colors",
                      data.party_type === t ? "border-primary/60 bg-primary/[0.06]" : "border-border hover:border-primary/40",
                    )}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground">{PARTY_TYPE_LABEL[t]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {org && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tên tổ chức / doanh nghiệp" required>
                <input value={data.org_name} onChange={(e) => set("org_name", e.target.value)} className={INPUT} />
              </Field>
              <Field label="Chức vụ người đại diện">
                <input
                  value={data.rep_title}
                  onChange={(e) => set("rep_title", e.target.value)}
                  placeholder="Giám đốc / Chủ hộ kinh doanh"
                  className={INPUT}
                />
              </Field>
              <Field label="Mã số thuế">
                <input value={data.org_tax_code} onChange={(e) => set("org_tax_code", e.target.value)} className={INPUT} />
              </Field>
              <Field label="Số ĐKKD / quyết định thành lập">
                <input value={data.org_reg_no} onChange={(e) => set("org_reg_no", e.target.value)} className={INPUT} />
              </Field>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={org ? "Họ tên người đại diện" : "Họ và tên người ký"} required>
              <input value={data.full_name} onChange={(e) => set("full_name", e.target.value)} className={INPUT} />
            </Field>
            <Field
              label="Ngày sinh"
              required
              hint={age !== null ? `Hiện ${age} tuổi.` : "Cần để xác định năng lực hành vi dân sự."}
            >
              <input type="date" value={data.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} className={INPUT} />
            </Field>
            <Field label="Số CCCD / Hộ chiếu" required>
              <input value={data.id_number} onChange={(e) => set("id_number", e.target.value)} className={INPUT} />
            </Field>
            <Field label="Ngày cấp">
              <input type="date" value={data.id_issued_date} onChange={(e) => set("id_issued_date", e.target.value)} className={INPUT} />
            </Field>
            <Field label="Nơi cấp">
              <input
                value={data.id_issued_by}
                onChange={(e) => set("id_issued_by", e.target.value)}
                placeholder="Cục Cảnh sát QLHC về TTXH"
                className={INPUT}
              />
            </Field>
            <Field label="Số điện thoại" required>
              <input value={data.phone} onChange={(e) => set("phone", e.target.value)} className={INPUT} />
            </Field>
            <Field label="Email" required>
              <input type="email" value={data.email} onChange={(e) => set("email", e.target.value)} className={INPUT} />
            </Field>
            <Field label={org ? "Địa chỉ trụ sở" : "Địa chỉ liên hệ"} required>
              <input value={data.address} onChange={(e) => set("address", e.target.value)} className={INPUT} />
            </Field>
          </div>

          {minor && (
            <div className="space-y-3 rounded-xl border border-amber-400/50 bg-amber-400/[0.06] p-4">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Người ký chưa đủ 18 tuổi — cần người đại diện theo pháp luật
              </p>
              <p className="text-[11px] text-muted-foreground">
                Theo Điều 21 Bộ luật Dân sự 2015, giao dịch của người chưa thành niên phải được người đại diện theo pháp
                luật (cha, mẹ hoặc người giám hộ) đồng ý. Thông tin dưới đây sẽ ghi vào hợp đồng.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Họ tên người đại diện" required>
                  <input value={data.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} className={INPUT} />
                </Field>
                <Field label="Quan hệ với người ký" required>
                  <input
                    value={data.guardian_relation}
                    onChange={(e) => set("guardian_relation", e.target.value)}
                    placeholder="Cha / Mẹ / Người giám hộ"
                    className={INPUT}
                  />
                </Field>
                <Field label="Số CCCD người đại diện" required>
                  <input
                    value={data.guardian_id_number}
                    onChange={(e) => set("guardian_id_number", e.target.value)}
                    className={INPUT}
                  />
                </Field>
                <Field label="Điện thoại người đại diện" required>
                  <input value={data.guardian_phone} onChange={(e) => set("guardian_phone", e.target.value)} className={INPUT} />
                </Field>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Thông tin cá nhân ở đây chỉ dùng để giao kết và thực hiện hợp đồng, xử lý theo Nghị định 13/2023/NĐ-CP. Xem
            thêm{" "}
            <Link href="/privacy-policy" className="text-primary underline dark:text-amber-400">
              Chính sách bảo mật
            </Link>
            .
          </p>
        </div>
      )}

      {/* ── Bước 3: đọc hợp đồng ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-3 text-xs text-muted-foreground">
            Đây là toàn văn hợp đồng sẽ được ký. Đọc kỹ trước khi sang bước ký — sau khi ký, bản này được lưu kèm mã
            kiểm tra toàn vẹn SHA-256 và không sửa được nữa.
          </div>
          <ContractDocumentView doc={doc} />
        </div>
      )}

      {/* ── Bước 4: ký ───────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Chữ ký điện tử này là chữ ký theo thỏa thuận giữa hai bên (Điều 9 hợp đồng), có giá trị như chữ ký tay đối
            với hợp đồng này. Hệ thống lưu lại thời điểm ký, địa chỉ IP và thiết bị của bạn làm bằng chứng giao kết.
          </div>

          <SignaturePad value={signature} onChange={setSignature} label={`Chữ ký của ${data.full_name || "Bên B"}`} />

          <Field label="Gõ lại họ tên để xác nhận" required hint="Phải trùng khớp họ tên đã khai ở bước 2.">
            <input
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
              placeholder={data.full_name}
              className={INPUT}
            />
          </Field>

          <div className="space-y-2">
            {[
              {
                key: "terms" as const,
                label: (
                  <>
                    Tôi đã đọc, hiểu và đồng ý toàn bộ nội dung hợp đồng cùng{" "}
                    <Link href="/terms-of-use" target="_blank" className="text-primary underline dark:text-amber-400">
                      Điều khoản sử dụng
                    </Link>{" "}
                    của Arex.
                  </>
                ),
              },
              {
                key: "privacy" as const,
                label: (
                  <>
                    Tôi đồng ý cho Arex xử lý dữ liệu cá nhân nêu tại Điều 8 hợp đồng theo{" "}
                    <Link href="/privacy-policy" target="_blank" className="text-primary underline dark:text-amber-400">
                      Chính sách bảo mật
                    </Link>{" "}
                    và Nghị định 13/2023/NĐ-CP.
                  </>
                ),
              },
              {
                key: "esign" as const,
                label: (
                  <>
                    Tôi đồng ý giao kết hợp đồng bằng phương tiện điện tử và công nhận chữ ký điện tử của mình có giá
                    trị như chữ ký tay theo Luật Giao dịch điện tử 2023.
                  </>
                ),
              },
            ].map((c) => (
              <label key={c.key} className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={consents[c.key]}
                  onChange={(e) => setConsents((p) => ({ ...p, [c.key]: e.target.checked }))}
                  className="mt-0.5 size-4 shrink-0"
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Lỗi + điều hướng */}
      {blocked && step !== 2 && (
        <ul className="space-y-1 rounded-xl border border-rose-500/30 bg-rose-500/[0.05] p-3 text-xs text-rose-600 dark:text-rose-400">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || sending}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <ArrowLeft className="size-4" /> Quay lại
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => !blocked && setStep((s) => s + 1)}
            disabled={blocked}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {step === 2 ? "Tôi đã đọc, sang bước ký" : "Tiếp tục"} <ArrowRight className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={blocked || sending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />}
            Ký & gửi hợp đồng
          </button>
        )}
      </div>
    </div>
  );
}
