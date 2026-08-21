"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Copy, ExternalLink, FileSignature, Handshake,
  Loader2, Plus, ScrollText, ShieldCheck, Trash2, User, UserPlus, Wrench,
} from "lucide-react";
import { PARTNER_TIERS, TIER_LABEL } from "@/lib/constants/partners";
import {
  PACKAGE_BENEFITS, PACKAGE_FEE_NOTE, PACKAGE_TAGLINE,
  MEMBER_BENEFITS, TECH_BENEFITS,
  IP_OWNERSHIP_LABEL, IP_OWNERSHIP_OPTIONS,
} from "@/lib/constants/partnership";
import { TEAM_DUTY_PRESETS, TEAM_DUTIES_MAX } from "@/lib/constants/team-duties";
import {
  ageFrom, buildContractDocument, isMinor, partyTypeFor,
  CONTRACT_KINDS, EMPTY_CONTRACT_INPUT, EXTRA_TERMS_MAX, EXTRA_TERM_BODY_MAX,
  EXTRA_TERM_PRESETS, EXTRA_TERM_TITLE_MAX, KIND_DESC, KIND_FORCED_PARTY, KIND_LABEL, KIND_PAIR,
  PARTY_TYPES, PARTY_TYPE_LABEL,
  type ContractInput, type ContractKind, type ExtraTerm, type PartyA,
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
  { title: "Hình thức", icon: Handshake },
  { title: "Nội dung", icon: ScrollText },
  { title: "Bên B", icon: User },
  { title: "Điều khoản riêng", icon: Plus },
  { title: "Đọc hợp đồng", icon: FileSignature },
  { title: "Ký & gửi", icon: ShieldCheck },
];

const KIND_ICON: Record<ContractKind, typeof Handshake> = {
  team: Handshake,
  member: UserPlus,
  tech: Wrench,
};

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

  const kind = data.kind;
  const partyType = partyTypeFor(kind, data.party_type);
  const asTeam = partyType === "team";
  const age = ageFrom(data.date_of_birth);
  const minor = isMinor(data.date_of_birth);

  const doc = useMemo(
    () => buildContractDocument(data, partyA, { code: "(cấp khi gửi)", signDate: today }),
    [data, partyA, today],
  );

  function pickKind(next: ContractKind) {
    setData((prev) => ({
      ...prev,
      kind: next,
      party_type: KIND_FORCED_PARTY[next] ?? prev.party_type,
    }));
  }

  function toggleDuty(duty: string) {
    setData((prev) => {
      const has = prev.duties.includes(duty);
      if (has) return { ...prev, duties: prev.duties.filter((d) => d !== duty) };
      if (prev.duties.length >= TEAM_DUTIES_MAX) return prev;
      return { ...prev, duties: [...prev.duties, duty] };
    });
  }

  function addExtra(term: ExtraTerm) {
    setData((prev) =>
      prev.extra_terms.length >= EXTRA_TERMS_MAX ? prev : { ...prev, extra_terms: [...prev.extra_terms, term] },
    );
  }

  function patchExtra(index: number, patch: Partial<ExtraTerm>) {
    setData((prev) => ({
      ...prev,
      extra_terms: prev.extra_terms.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  }

  function removeExtra(index: number) {
    setData((prev) => ({ ...prev, extra_terms: prev.extra_terms.filter((_, i) => i !== index) }));
  }

  // ── Điều kiện đi tiếp từng bước ────────────────────────────────────────────
  const errors: string[] = [];
  if (step === 1) {
    if (data.scope.trim().length < 20) errors.push("Mô tả nội dung hợp tác tối thiểu 20 ký tự.");
    if (!data.term_start || !data.term_end) errors.push("Chọn thời hạn hợp tác.");
    else if (data.term_end <= data.term_start) errors.push("Ngày kết thúc phải sau ngày bắt đầu.");
    if (kind === "member" && !data.member_role.trim()) errors.push("Điền vai trò bạn tham gia đội ngũ.");
    if (kind === "tech" && !data.deliverables.trim()) errors.push("Ghi rõ sản phẩm bàn giao và mốc thời gian.");
  }
  if (step === 2) {
    if (data.full_name.trim().length < 2) errors.push("Điền họ tên người ký.");
    if (asTeam) {
      if (!data.team_name.trim()) errors.push("Điền tên đội, nhóm hoặc cộng đồng.");
      if (!data.rep_title.trim()) errors.push("Điền vai trò của bạn trong đội.");
    } else if (!data.display_name.trim()) {
      errors.push("Điền biệt danh hoặc tên bạn dùng trong cộng đồng.");
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email.trim())) errors.push("Email không hợp lệ.");
    if (data.contact_link.trim().length < 3) errors.push("Điền một kênh liên lạc (Discord, Zalo, Telegram, Facebook…).");
    if (kind === "member") {
      if (!data.date_of_birth) errors.push("Điền ngày sinh — đội ngũ cần biết để giao việc đúng độ tuổi.");
      else if (age === null) errors.push("Ngày sinh không hợp lệ.");
      if (data.game_uid.trim() && !/^\d{6,15}$/.test(data.game_uid.trim())) errors.push("UID Free Fire chỉ gồm chữ số.");
    } else if (data.date_of_birth && age === null) {
      errors.push("Ngày sinh không hợp lệ.");
    }
    if (minor) {
      if (!data.guardian_name.trim()) errors.push("Chưa đủ 18 tuổi — điền họ tên người đại diện theo pháp luật.");
      if (!data.guardian_relation.trim()) errors.push("Điền quan hệ của người đại diện với người ký.");
      if (!data.guardian_phone.trim()) errors.push("Điền số điện thoại người đại diện.");
    }
  }
  if (step === 3) {
    data.extra_terms.forEach((t, i) => {
      if (!t.title.trim() || !t.body.trim()) errors.push(`Điều khoản riêng số ${i + 1} còn thiếu tiêu đề hoặc nội dung.`);
    });
  }
  if (step === 5) {
    if (!signature) errors.push("Chưa ký vào ô chữ ký.");
    if (signedName.trim().toLowerCase().replace(/\s+/g, " ") !== data.full_name.trim().toLowerCase().replace(/\s+/g, " "))
      errors.push("Họ tên xác nhận phải trùng khớp với họ tên đã khai ở bước Bên B.");
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
          party_type: partyType,
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

  const benefitPreview =
    kind === "team" ? PACKAGE_BENEFITS[data.tier] : kind === "member" ? MEMBER_BENEFITS : TECH_BENEFITS;

  return (
    <div className="space-y-5">
      {/* Thanh bước */}
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
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
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{s.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* ── Bước 1: hình thức hợp đồng ───────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <span className={LABEL}>Hợp đồng này ký giữa ai với ai? *</span>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {CONTRACT_KINDS.map((k) => {
                const Icon = KIND_ICON[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pickKind(k)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      kind === k ? "border-primary/60 bg-primary/[0.06]" : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-primary dark:text-amber-400" />
                      <span className="font-heading text-sm font-black uppercase tracking-tight text-foreground">
                        {KIND_LABEL[k]}
                      </span>
                    </span>
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{KIND_PAIR[k]}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{KIND_DESC[k]}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {kind === "team" && (
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
          )}

          {kind === "tech" && (
            <div>
              <span className={LABEL}>Bạn nhận hạng mục với tư cách *</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PARTY_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("party_type", t)}
                    className={cn(
                      "rounded-xl border p-3 text-left text-sm font-bold text-foreground transition-colors",
                      partyType === t ? "border-primary/60 bg-primary/[0.06]" : "border-border hover:border-primary/40",
                    )}
                  >
                    {PARTY_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
            <p className={LABEL}>Arex cam kết gì với bạn trong hợp đồng này</p>
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              {benefitPreview.map((b) => (
                <li key={b} className="flex gap-1.5">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Hợp đồng này không hỏi căn cước, mã số thuế hay giấy đăng ký kinh doanh — đây là thỏa thuận giữa đội nhóm và
            cá nhân trong cộng đồng, không phải hợp đồng giữa hai doanh nghiệp.
          </p>
        </div>
      )}

      {/* ── Bước 2: nội dung ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {kind === "member" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Vai trò bạn tham gia" required hint="Ví dụ: Cộng tác viên tin tức, Kiểm duyệt viên, Designer.">
                  <input
                    value={data.member_role}
                    onChange={(e) => set("member_role", e.target.value)}
                    className={INPUT}
                  />
                </Field>
                <Field label="Mức cam kết" hint="Ví dụ: 3 bài/tuần, trực kiểm duyệt tối 2 buổi/tuần. Để trống nếu linh hoạt.">
                  <input value={data.commitment} onChange={(e) => set("commitment", e.target.value)} className={INPUT} />
                </Field>
              </div>

              <div>
                <span className={LABEL}>Mảng phụ trách (tối đa {TEAM_DUTIES_MAX})</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TEAM_DUTY_PRESETS.map((d) => {
                    const active = data.duties.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDuty(d)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
                          active
                            ? "border-primary/60 bg-primary/[0.08] text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {kind === "tech" && (
            <>
              <Field
                label="Sản phẩm bàn giao & mốc thời gian"
                required
                hint="Ví dụ: hoàn tất tích hợp thanh toán trước 30/9, bàn giao mã nguồn + tài liệu vận hành."
              >
                <textarea
                  rows={3}
                  value={data.deliverables}
                  onChange={(e) => set("deliverables", e.target.value)}
                  className={AREA}
                />
              </Field>
              <Field label="Mức hỗ trợ / thời gian phản hồi" hint="Ví dụ: phản hồi trong 24 giờ, sự cố nghiêm trọng xử lý trong 4 giờ.">
                <input value={data.sla} onChange={(e) => set("sla", e.target.value)} className={INPUT} />
              </Field>
              <div>
                <span className={LABEL}>Quyền sở hữu sản phẩm bàn giao *</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {IP_OWNERSHIP_OPTIONS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => set("ip_ownership", o)}
                      className={cn(
                        "rounded-xl border p-3 text-left text-xs font-semibold text-foreground transition-colors",
                        data.ip_ownership === o
                          ? "border-primary/60 bg-primary/[0.06]"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {IP_OWNERSHIP_LABEL[o]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <Field
            label={kind === "member" ? "Phạm vi công việc cụ thể" : "Nội dung hợp tác cụ thể"}
            required
            hint="Mô tả rõ hai bên làm gì cho nhau — nội dung này ghi thẳng vào điều khoản phạm vi của hợp đồng."
          >
            <textarea
              rows={4}
              value={data.scope}
              onChange={(e) => set("scope", e.target.value)}
              placeholder={
                kind === "member"
                  ? "Ví dụ: Viết và biên tập tin tức Free Fire cho chuyên mục Tin tức, kiểm tra nguồn trước khi đăng, hỗ trợ dựng bài sự kiện theo mùa."
                  : kind === "tech"
                    ? "Ví dụ: Xây dựng và duy trì công cụ tra cứu UID, tối ưu tốc độ tải trang, hỗ trợ xử lý sự cố hạ tầng."
                    : "Ví dụ: Bên B tài trợ 5.000.000đ tiền thưởng cho giải Arex Cup mùa 3; Bên A đặt logo Bên B trên ảnh bìa giải và đăng 2 bài giới thiệu."
              }
              className={AREA}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={kind === "member" ? "Bắt đầu tham gia" : "Bắt đầu hợp tác"} required>
              <input type="date" value={data.term_start} onChange={(e) => set("term_start", e.target.value)} className={INPUT} />
            </Field>
            <Field label="Kết thúc" required>
              <input type="date" value={data.term_end} onChange={(e) => set("term_end", e.target.value)} className={INPUT} />
            </Field>
          </div>

          <Field
            label={kind === "member" ? "Hỗ trợ / thù lao" : "Giá trị hợp tác"}
            hint="Để trống nếu hai bên không trao đổi tiền — hợp đồng sẽ ghi đúng như vậy."
          >
            <input
              value={data.consideration}
              onChange={(e) => set("consideration", e.target.value)}
              placeholder={
                kind === "member"
                  ? "Ví dụ: 50.000đ/bài được duyệt, thưởng thêm theo tháng nếu vượt chỉ tiêu"
                  : "Ví dụ: 5.000.000 VNĐ tiền thưởng + 10 mã quà tặng"
              }
              className={INPUT}
            />
          </Field>

          <Field label="Cách thức & kỳ hạn chi trả" hint="Chỉ điền khi có phát sinh thanh toán.">
            <input
              value={data.payment_terms}
              onChange={(e) => set("payment_terms", e.target.value)}
              placeholder="Ví dụ: chuyển khoản vào ngày 05 hằng tháng cho phần việc tháng trước"
              className={INPUT}
            />
          </Field>
        </div>
      )}

      {/* ── Bước 3: thông tin Bên B ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {asTeam && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tên đội / nhóm / cộng đồng" required>
                <input value={data.team_name} onChange={(e) => set("team_name", e.target.value)} className={INPUT} />
              </Field>
              <Field label="Tên viết tắt / tag" hint="Ví dụ: AREX, VNFF.">
                <input value={data.team_tag} onChange={(e) => set("team_tag", e.target.value)} className={INPUT} />
              </Field>
              <Field label="Quy mô" hint="Ví dụ: 12 thành viên, nhóm Zalo 500 người.">
                <input value={data.team_size} onChange={(e) => set("team_size", e.target.value)} className={INPUT} />
              </Field>
              <Field label="Vai trò của bạn trong đội" required hint="Ví dụ: Đội trưởng, Quản trị viên, Người sáng lập.">
                <input value={data.rep_title} onChange={(e) => set("rep_title", e.target.value)} className={INPUT} />
              </Field>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={asTeam ? "Họ tên người ký" : "Họ và tên"} required>
              <input value={data.full_name} onChange={(e) => set("full_name", e.target.value)} className={INPUT} />
            </Field>
            <Field
              label="Biệt danh / tên trong cộng đồng"
              required={!asTeam}
              hint="Tên mọi người vẫn gọi bạn trong game và trên các kênh."
            >
              <input value={data.display_name} onChange={(e) => set("display_name", e.target.value)} className={INPUT} />
            </Field>
            <Field
              label="Ngày sinh"
              required={kind === "member"}
              hint={age !== null ? `Hiện ${age} tuổi.` : "Dùng để xác định người ký đã đủ 18 tuổi hay chưa."}
            >
              <input type="date" value={data.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} className={INPUT} />
            </Field>
            <Field label="UID Free Fire" hint="Chỉ gồm chữ số. Để trống nếu không dùng tới.">
              <input value={data.game_uid} onChange={(e) => set("game_uid", e.target.value)} className={INPUT} />
            </Field>
            <Field label="Email" required>
              <input type="email" value={data.email} onChange={(e) => set("email", e.target.value)} className={INPUT} />
            </Field>
            <Field label="Số điện thoại">
              <input value={data.phone} onChange={(e) => set("phone", e.target.value)} className={INPUT} />
            </Field>
            <Field
              label="Kênh liên lạc chính"
              required
              hint="Discord, Zalo, Telegram hoặc Facebook — nơi Arex nhắn được cho bạn."
            >
              <input
                value={data.contact_link}
                onChange={(e) => set("contact_link", e.target.value)}
                placeholder="Ví dụ: Discord @tenban hoặc https://facebook.com/..."
                className={INPUT}
              />
            </Field>
            <Field label="Khu vực" hint="Tỉnh, thành phố hoặc khu vực hoạt động. Không cần địa chỉ chi tiết.">
              <input value={data.area} onChange={(e) => set("area", e.target.value)} className={INPUT} />
            </Field>
          </div>

          <Field
            label={asTeam ? "Kênh / nền tảng của đội" : "Kênh / nền tảng của bạn"}
            hint="Fanpage, TikTok, YouTube, nhóm Zalo/Discord… mỗi dòng một liên kết."
          >
            <textarea
              rows={2}
              value={data.channels}
              onChange={(e) => set("channels", e.target.value)}
              placeholder="https://facebook.com/... , https://tiktok.com/@..."
              className={AREA}
            />
          </Field>

          {minor && (
            <div className="space-y-3 rounded-xl border border-amber-400/50 bg-amber-400/[0.06] p-4">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Người ký chưa đủ 18 tuổi — cần người đại diện theo pháp luật
              </p>
              <p className="text-[11px] text-muted-foreground">
                Theo Điều 21 Bộ luật Dân sự 2015, giao dịch của người chưa thành niên phải được người đại diện theo pháp
                luật (cha, mẹ hoặc người giám hộ) đồng ý. Chỉ cần tên, quan hệ và số liên lạc — không cần giấy tờ.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
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
                <Field label="Điện thoại người đại diện" required>
                  <input value={data.guardian_phone} onChange={(e) => set("guardian_phone", e.target.value)} className={INPUT} />
                </Field>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Thông tin ở đây chỉ dùng để giao kết và thực hiện hợp đồng, xử lý theo Nghị định 13/2023/NĐ-CP. Xem thêm{" "}
            <Link href="/privacy-policy" className="text-primary underline dark:text-amber-400">
              Chính sách bảo mật
            </Link>
            .
          </p>
        </div>
      )}

      {/* ── Bước 4: điều khoản riêng ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-3 text-xs text-muted-foreground">
            Đây là phần của <strong className="text-foreground">bạn</strong>. Điều khoản bạn thêm vào nằm ngay trong hợp
            đồng, có giá trị ngang các điều khoản mẫu, và Arex đọc rồi mới ký. Không thêm gì cũng được — hợp đồng vẫn đầy
            đủ. Tối đa {EXTRA_TERMS_MAX} điều khoản.
          </div>

          <div>
            <span className={LABEL}>Mẫu gợi ý — bấm để chèn rồi sửa lại</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXTRA_TERM_PRESETS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => addExtra({ ...p })}
                  disabled={data.extra_terms.length >= EXTRA_TERMS_MAX}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                >
                  <Plus className="size-3" /> {p.title}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {data.extra_terms.map((t, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Điều khoản {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExtra(i)}
                    className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-400"
                  >
                    <Trash2 className="size-3.5" /> Xóa
                  </button>
                </div>
                <input
                  value={t.title}
                  maxLength={EXTRA_TERM_TITLE_MAX}
                  onChange={(e) => patchExtra(i, { title: e.target.value })}
                  placeholder="Tiêu đề, ví dụ: Độc quyền trong phạm vi hợp tác"
                  className={INPUT}
                />
                <textarea
                  rows={3}
                  value={t.body}
                  maxLength={EXTRA_TERM_BODY_MAX}
                  onChange={(e) => patchExtra(i, { body: e.target.value })}
                  placeholder="Nội dung điều khoản — viết rõ ai làm gì, trong bao lâu, không đạt thì sao."
                  className={AREA}
                />
                <p className="text-right text-[10px] text-muted-foreground">
                  {t.body.length}/{EXTRA_TERM_BODY_MAX}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addExtra({ title: "", body: "" })}
            disabled={data.extra_terms.length >= EXTRA_TERMS_MAX}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-40"
          >
            <Plus className="size-4" /> Thêm điều khoản trống
          </button>

          <p className="text-[11px] text-muted-foreground">
            Điều khoản riêng không được trái pháp luật hoặc trái phần quy tắc nội dung, bảo vệ dữ liệu và chữ ký điện tử
            của mẫu — nếu trái, phần mẫu được ưu tiên áp dụng. Arex có quyền từ chối ký nếu không đồng ý với điều khoản
            bạn đưa vào.
          </p>
        </div>
      )}

      {/* ── Bước 5: đọc hợp đồng ─────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-3 text-xs text-muted-foreground">
            Đây là toàn văn hợp đồng sẽ được ký. Đọc kỹ trước khi sang bước ký — sau khi ký, bản này được lưu kèm mã
            kiểm tra toàn vẹn SHA-256 và không sửa được nữa.
          </div>
          <ContractDocumentView doc={doc} />
        </div>
      )}

      {/* ── Bước 6: ký ───────────────────────────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Chữ ký điện tử này là chữ ký theo thỏa thuận giữa hai bên, có giá trị như chữ ký tay đối với hợp đồng này.
            Hệ thống lưu lại thời điểm ký, địa chỉ IP và thiết bị của bạn làm bằng chứng giao kết.
          </div>

          <SignaturePad value={signature} onChange={setSignature} label={`Chữ ký của ${data.full_name || "Bên B"}`} />

          <Field label="Gõ lại họ tên để xác nhận" required hint="Phải trùng khớp họ tên đã khai ở bước Bên B.">
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
                    Tôi đồng ý cho Arex xử lý dữ liệu cá nhân nêu trong hợp đồng theo{" "}
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
      {blocked && step !== 4 && (
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
            {step === 4 ? "Tôi đã đọc, sang bước ký" : "Tiếp tục"} <ArrowRight className="size-4" />
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
