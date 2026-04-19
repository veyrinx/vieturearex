import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Chính Sách Cookie | Arex",
  description:
    "Chính sách Cookie của Arex — thông tin về cách chúng tôi sử dụng cookie, các loại cookie và quyền kiểm soát của bạn.",
};

const sections = [
  {
    id: "what-is-cookie",
    title: "1. Cookie Là Gì?",
    content: `Cookie là các tệp văn bản nhỏ được lưu trữ trên thiết bị của bạn (máy tính, điện thoại, máy tính bảng) khi bạn truy cập một trang web. Cookie giúp trang web ghi nhớ thông tin về lượt truy cập của bạn, chẳng hạn như ngôn ngữ ưa thích hoặc thông tin đăng nhập, giúp trải nghiệm duyệt web trở nên thuận tiện hơn.

Cookie không phải là chương trình, không chứa mã độc và không thể tự chạy trên thiết bị của bạn. Chúng chỉ là dữ liệu văn bản được đọc bởi máy chủ web.`,
  },
  {
    id: "cookie-types",
    title: "2. Các Loại Cookie Chúng Tôi Sử Dụng",
    subsections: [
      {
        title: "2.1 Cookie Thiết Yếu (Essential Cookies)",
        badge: "Luôn bật",
        badgeClass: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
        content:
          "Các cookie này là bắt buộc để trang web hoạt động đúng chức năng. Chúng bao gồm cookie phiên đăng nhập, token xác thực và cookie bảo mật CSRF. Bạn không thể tắt các cookie này vì chúng ảnh hưởng trực tiếp đến khả năng sử dụng trang web.",
        examples: [
          "Cookie phiên đăng nhập (session token) — duy trì trạng thái đăng nhập",
          "Cookie bảo mật CSRF — ngăn chặn tấn công giả mạo yêu cầu",
          "Cookie tùy chọn UI — lưu cài đặt theme sáng/tối",
        ],
      },
      {
        title: "2.2 Cookie Hiệu Suất & Phân Tích (Analytics Cookies)",
        badge: "Tùy chọn",
        badgeClass: "bg-sky-500/15 text-sky-500 border-sky-500/30",
        content:
          "Các cookie này giúp chúng tôi hiểu cách người dùng tương tác với trang web — trang nào được xem nhiều nhất, thời gian trung bình trên trang và nguồn truy cập. Dữ liệu này được thu thập ở dạng tổng hợp, không thể xác định danh tính cá nhân.",
        examples: [
          "Lượt xem trang và thời gian phiên duyệt web",
          "Nguồn truy cập (tìm kiếm, mạng xã hội, trực tiếp)",
          "Tỷ lệ thoát và điều hướng trong trang",
        ],
      },
      {
        title: "2.3 Cookie Chức Năng (Functional Cookies)",
        badge: "Tùy chọn",
        badgeClass: "bg-sky-500/15 text-sky-500 border-sky-500/30",
        content:
          "Các cookie này ghi nhớ các lựa chọn của bạn để cung cấp trải nghiệm được cá nhân hóa hơn. Ví dụ như ngôn ngữ hiển thị, cài đặt thông báo hoặc bố cục ưa thích.",
        examples: [
          "Cài đặt giao diện (theme, ngôn ngữ)",
          "Tùy chọn nhận thông báo đẩy",
          "Tùy chọn hiển thị nội dung",
        ],
      },
      {
        title: "2.4 Cookie Bên Thứ Ba (Third-party Cookies)",
        badge: "Bên ngoài",
        badgeClass: "bg-orange-500/15 text-orange-500 border-orange-500/30",
        content:
          "Một số nội dung nhúng từ bên thứ ba (như YouTube, Facebook) có thể đặt cookie riêng trên thiết bị của bạn khi bạn tương tác với các nội dung đó. Chúng tôi không kiểm soát các cookie này. Bạn có thể xem chính sách cookie của từng bên để biết thêm chi tiết.",
        examples: [
          "YouTube — khi xem video nhúng từ kênh của chúng tôi",
          "Facebook — khi tương tác với widget chia sẻ mạng xã hội",
          "ImageKit CDN — phục vụ hình ảnh tối ưu hóa",
        ],
      },
    ],
  },
  {
    id: "storage-duration",
    title: "3. Thời Gian Lưu Trữ Cookie",
    content: `Cookie được phân thành hai loại theo thời gian tồn tại:

**Cookie phiên (Session Cookies):** Tự động xóa khi bạn đóng trình duyệt. Chúng tôi dùng loại này cho cookie đăng nhập tạm thời và token xác thực.

**Cookie lâu dài (Persistent Cookies):** Được lưu trữ trên thiết bị của bạn trong một khoảng thời gian xác định, thường từ 30 ngày đến 1 năm, tùy thuộc vào mục đích sử dụng. Ví dụ: cookie ghi nhớ cài đặt theme sáng/tối.`,
    table: [
      { name: "auth-token", type: "Thiết yếu", duration: "7 ngày", purpose: "Duy trì đăng nhập" },
      { name: "theme-preference", type: "Chức năng", duration: "1 năm", purpose: "Ghi nhớ giao diện" },
      { name: "csrf-token", type: "Thiết yếu", duration: "Phiên", purpose: "Bảo mật form" },
      { name: "_analytics", type: "Phân tích", duration: "90 ngày", purpose: "Thống kê lượt truy cập" },
    ],
  },
  {
    id: "your-rights",
    title: "4. Quyền Kiểm Soát Cookie Của Bạn",
    content: `Bạn có toàn quyền kiểm soát cookie trên thiết bị của mình thông qua các cách sau:`,
    controls: [
      {
        icon: "🛡️",
        title: "Cài đặt trình duyệt",
        desc: "Hầu hết trình duyệt hiện đại cho phép bạn xem, xóa hoặc chặn cookie. Truy cập phần Cài đặt → Quyền riêng tư (hoặc Bảo mật) trong trình duyệt của bạn.",
      },
      {
        icon: "🔒",
        title: "Chế độ riêng tư (Incognito)",
        desc: "Duyệt ở chế độ ẩn danh sẽ không lưu cookie sau khi đóng cửa sổ. Lưu ý: cookie vẫn hoạt động trong phiên duyệt hiện tại.",
      },
      {
        icon: "⚙️",
        title: "Tùy chọn đồng ý cookie",
        desc: "Khi truy cập lần đầu, bạn sẽ được yêu cầu đồng ý hoặc từ chối các cookie không thiết yếu. Bạn có thể thay đổi lựa chọn này bất kỳ lúc nào.",
      },
      {
        icon: "🗑️",
        title: "Xóa cookie hiện có",
        desc: "Bạn có thể xóa tất cả cookie đã lưu bằng cách vào Cài đặt trình duyệt → Xóa dữ liệu duyệt web → Cookie và dữ liệu trang web.",
      },
    ],
  },
  {
    id: "legal-basis",
    title: "5. Cơ Sở Pháp Lý",
    content: `Việc sử dụng cookie của chúng tôi dựa trên các căn cứ pháp lý sau đây theo quy định của pháp luật Việt Nam:

• **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân — chúng tôi xử lý dữ liệu có được từ cookie theo nguyên tắc tối thiểu hóa dữ liệu và giới hạn mục đích.

• **Luật An toàn thông tin mạng 2015** — chúng tôi cam kết bảo vệ an toàn thông tin người dùng được thu thập qua cookie.

• **Điều khoản đồng ý (Consent)** — đối với cookie không thiết yếu, chúng tôi chỉ thu thập sau khi có sự đồng ý rõ ràng của bạn.`,
  },
  {
    id: "updates",
    title: "6. Cập Nhật Chính Sách",
    content: `Chúng tôi có thể cập nhật Chính sách Cookie này theo thời gian để phản ánh các thay đổi trong công nghệ, pháp luật hoặc cách chúng tôi vận hành dịch vụ.

Mọi thay đổi quan trọng sẽ được thông báo trên trang web. Ngày "Cập nhật lần cuối" ở trên cùng trang sẽ luôn phản ánh phiên bản mới nhất. Việc tiếp tục sử dụng trang web sau khi chính sách được cập nhật đồng nghĩa với việc bạn chấp nhận các thay đổi đó.`,
  },
  {
    id: "contact",
    title: "7. Liên Hệ",
    content: `Nếu bạn có bất kỳ câu hỏi nào về Chính sách Cookie này hoặc muốn thực hiện quyền của mình liên quan đến dữ liệu thu thập qua cookie, vui lòng liên hệ:

**Email:** ${siteConfig.contactEmail}
**Website:** ${siteConfig.url}
**Thời gian phản hồi:** Trong vòng 5 ngày làm việc kể từ khi nhận được yêu cầu.`,
  },
];

function SectionContent({ content }: { content: string }) {
  return (
    <div className="space-y-3">
      {content.split("\n\n").map((paragraph, i) => (
        <p key={i} className="text-sm leading-7 text-muted-foreground">
          {paragraph.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-semibold text-foreground">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      ))}
    </div>
  );
}

export default function CookiePolicyPage() {
  const lastUpdated = "19 tháng 4, 2026";

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-muted/30 py-14">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-400/5 dark:from-primary/8 dark:to-amber-400/8" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary dark:bg-amber-400" />
            Pháp lý &amp; Quyền riêng tư
          </div>
          <h1 className="font-heading text-3xl font-black uppercase tracking-[0.06em] text-foreground sm:text-4xl">
            Chính Sách Cookie
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Cập nhật lần cuối:{" "}
            <time className="font-medium text-foreground">{lastUpdated}</time>
          </p>
          <p className="mt-4 text-sm leading-7 text-muted-foreground max-w-xl mx-auto">
            Tài liệu này giải thích cách{" "}
            <span className="font-semibold text-foreground">Arex</span> sử dụng cookie
            và các công nghệ tương tự, các loại cookie được sử dụng, và quyền kiểm
            soát của bạn đối với chúng.
          </p>
        </div>
      </section>

      {/* Quick nav */}
      <nav className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl overflow-x-auto px-6">
          <ul className="flex gap-1 py-2">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  className="inline-block rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {s.title.replace(/^\d+\.\s*/, "")}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="space-y-10">
          {sections.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="scroll-mt-28 rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <h2 className="mb-5 font-heading text-lg font-bold uppercase tracking-[0.06em] text-foreground">
                {section.title}
              </h2>

              {/* Plain content */}
              {"content" in section && section.content && (
                <SectionContent content={section.content} />
              )}

              {/* Subsections (cookie types) */}
              {"subsections" in section && section.subsections && (
                <div className="space-y-5">
                  {section.subsections.map((sub) => (
                    <div
                      key={sub.title}
                      className="rounded-xl border border-border bg-muted/30 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">{sub.title}</h3>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${sub.badgeClass}`}
                        >
                          {sub.badge}
                        </span>
                      </div>
                      <p className="mb-3 text-sm leading-6 text-muted-foreground">
                        {sub.content}
                      </p>
                      <ul className="space-y-1.5">
                        {sub.examples.map((ex) => (
                          <li key={ex} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/60 dark:bg-amber-400/60" />
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Cookie table */}
              {"table" in section && section.table && (
                <div className="mt-5 overflow-hidden rounded-xl border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        {["Tên Cookie", "Loại", "Thời gian", "Mục đích"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.1em]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-2.5 font-mono text-xs text-foreground">{row.name}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.type}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.duration}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Controls grid */}
              {"controls" in section && section.controls && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {section.controls.map((ctrl) => (
                    <div
                      key={ctrl.title}
                      className="rounded-xl border border-border bg-muted/30 p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-lg">{ctrl.icon}</span>
                        <p className="text-sm font-bold text-foreground">{ctrl.title}</p>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">{ctrl.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Related links */}
        <div className="mt-10 rounded-2xl border border-border bg-muted/30 p-6">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Tài liệu liên quan
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/privacy-policy"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:hover:border-amber-400/40 dark:hover:text-amber-400"
            >
              Chính Sách Bảo Mật →
            </Link>
            <Link
              href="/terms-of-use"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:hover:border-amber-400/40 dark:hover:text-amber-400"
            >
              Điều Khoản Sử Dụng →
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:hover:border-amber-400/40 dark:hover:text-amber-400"
            >
              Liên Hệ Chúng Tôi →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
