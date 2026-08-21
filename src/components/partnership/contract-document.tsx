import type { ContractDocument } from "@/lib/constants/partnership-contract";
import { cn } from "@/lib/utils";

export type SignatureBlock = {
  /** Nhãn dưới ô ký, ví dụ "ĐẠI DIỆN BÊN A". */
  heading: string;
  name: string;
  title?: string | null;
  /** data:image/png;base64,... — chưa ký thì để trống, ô ký bỏ trắng như bản giấy. */
  image?: string | null;
  signedAt?: string | null;
  meta?: Array<[string, string]>;
};

function Lines({ lines }: { lines: Array<[string, string]> }) {
  return (
    <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,200px)_1fr]">
      {lines.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-xs font-semibold text-muted-foreground sm:text-sm">{k}:</dt>
          <dd className="text-sm text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function SignatureCell({ block }: { block: SignatureBlock }) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-heading text-xs font-black uppercase tracking-widest text-foreground">{block.heading}</p>
      {block.title && <p className="mt-0.5 text-[11px] italic text-muted-foreground">{block.title}</p>}
      <div className="mt-2 flex h-24 w-full items-center justify-center">
        {block.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={block.image} alt={`Chữ ký ${block.name}`} className="max-h-24 max-w-full object-contain dark:invert" />
        ) : (
          <span className="text-[11px] text-muted-foreground/60">(chưa ký)</span>
        )}
      </div>
      <p className="w-full border-t border-border pt-1.5 text-sm font-bold text-foreground">
        {block.name || "……………………"}
      </p>
      {block.signedAt && <p className="mt-0.5 text-[11px] text-muted-foreground">Ký lúc {block.signedAt}</p>}
      {block.meta && block.meta.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
          {block.meta.map(([k, v]) => (
            <li key={k}>
              {k}: <span className="font-mono">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Hai ô ký cuối hợp đồng — tách riêng để bản "nguyên văn đã lưu" cũng dùng lại được. */
export function ContractSignatures({ a, b }: { a: SignatureBlock; b: SignatureBlock }) {
  return (
    <div className="mt-8 grid gap-8 sm:grid-cols-2">
      <SignatureCell block={a} />
      <SignatureCell block={b} />
    </div>
  );
}

/**
 * Bản hợp đồng như in ra giấy. Dùng chung cho ba nơi: xem trước lúc điền, trang
 * xem lại của đối tác, và bảng quản trị — để cả ba luôn hiển thị y hệt nhau.
 */
export function ContractDocumentView({
  doc,
  hash,
  signatures,
  className,
}: {
  doc: ContractDocument;
  hash?: string | null;
  signatures?: { a: SignatureBlock; b: SignatureBlock };
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-5 leading-relaxed md:p-8 print:border-0 print:p-0",
        className,
      )}
    >
      <header className="text-center">
        <p className="font-heading text-sm font-black uppercase tracking-tight text-foreground">
          Cộng hòa xã hội chủ nghĩa Việt Nam
        </p>
        <p className="text-sm font-bold text-foreground">Độc lập - Tự do - Hạnh phúc</p>
        <p className="mx-auto mt-1 h-px w-32 bg-foreground/40" />
        <h2 className="mt-6 font-heading text-lg font-black uppercase tracking-tight text-foreground md:text-xl">
          {doc.title}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">Số: {doc.code}</p>
      </header>

      <section className="mt-6 text-sm">
        <p className="font-semibold text-foreground">Căn cứ:</p>
        <ul className="mt-1 space-y-0.5 text-muted-foreground">
          {doc.bases.map((b) => (
            <li key={b} className="pl-4 -indent-4">
              — {b}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-5 text-sm text-foreground">{doc.signPlaceDate}</p>

      <section className="mt-4">
        <h3 className="font-heading text-sm font-black uppercase tracking-wide text-foreground">{doc.partyA.heading}</h3>
        <Lines lines={doc.partyA.lines} />
      </section>

      <section className="mt-5">
        <h3 className="font-heading text-sm font-black uppercase tracking-wide text-foreground">{doc.partyB.heading}</h3>
        <Lines lines={doc.partyB.lines} />
      </section>

      {doc.guardian && (
        <section className="mt-5 rounded-xl border border-amber-400/40 bg-amber-400/5 p-4">
          <h3 className="font-heading text-sm font-black uppercase tracking-wide text-foreground">
            {doc.guardian.heading}
          </h3>
          <Lines lines={doc.guardian.lines} />
          <p className="mt-2 text-[11px] italic text-muted-foreground">
            Người đại diện theo pháp luật đồng ý cho người ký của Bên B giao kết hợp đồng này theo Điều 21 Bộ luật Dân
            sự 2015 và cùng chịu trách nhiệm về việc thực hiện hợp đồng.
          </p>
        </section>
      )}

      <p className="mt-6 text-sm font-semibold text-foreground">
        Hai bên thống nhất giao kết hợp đồng với các điều khoản sau:
      </p>

      <div className="mt-3 space-y-5">
        {doc.articles.map((a) => (
          <section key={a.no}>
            <h3 className="font-heading text-sm font-black uppercase tracking-wide text-foreground">
              {a.no}. {a.title}
            </h3>
            <div className="mt-1 space-y-1 text-sm text-muted-foreground">
              {a.items.map((item, i) => (
                <p key={i} className={item.startsWith("   ") ? "pl-6 -indent-3" : ""}>
                  {item.trim()}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {hash && (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Mã kiểm tra toàn vẹn (SHA-256)
          </p>
          <p className="mt-1 break-all font-mono text-[11px] text-foreground">{hash}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Băm từ toàn văn hợp đồng lúc ký. Nội dung bị sửa một ký tự là mã này đổi hoàn toàn.
          </p>
        </div>
      )}

      {signatures && <ContractSignatures a={signatures.a} b={signatures.b} />}

      <p className="mt-8 text-center text-[11px] text-muted-foreground/70">
        Mẫu điều khoản phiên bản {doc.version} · Hợp đồng điện tử theo Luật Giao dịch điện tử 2023
      </p>
    </article>
  );
}
