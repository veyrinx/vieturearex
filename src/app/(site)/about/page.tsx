import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "Về Chúng Tôi — Arex Network",
  description:
    "Arex là cổng thông tin cộng đồng Free Fire độc lập hàng đầu tại Việt Nam. Cung cấp tin tức, lịch sự kiện, Esports và nội dung cộng đồng được cập nhật hàng ngày bởi người chơi, dành cho người chơi.",
  alternates: { canonical: `${siteConfig.url}/about` },
  openGraph: {
    title: "Về Chúng Tôi — Arex Network",
    description:
      "Tìm hiểu về Arex — cổng thông tin cộng đồng Free Fire độc lập tại Việt Nam, sứ mệnh và các nội dung chúng tôi cung cấp.",
    url: `${siteConfig.url}/about`,
    type: "website",
    siteName: siteConfig.name,
  },
  robots: { index: true, follow: true, "max-snippet": -1 },
};

export const revalidate = 3600;

const STATS = [
  { label: "Bài viết tin tức", value: "500+", desc: "Tin tức Free Fire cập nhật liên tục" },
  { label: "Sự kiện theo dõi", value: "200+", desc: "Lịch sự kiện in-game đầy đủ" },
  { label: "Lượt xem hàng tháng", value: "50K+", desc: "Người chơi tin tưởng Arex" },
  { label: "Năm hoạt động", value: "2+", desc: "Đồng hành cùng cộng đồng Free Fire" },
];

const SECTIONS = [
  {
    title: "Arex là gì?",
    content: [
      "Arex Network là cổng thông tin cộng đồng Free Fire độc lập tại Việt Nam, được xây dựng và vận hành bởi những người chơi đam mê game. Chúng tôi không có liên kết chính thức với Garena hay bất kỳ tổ chức phát hành game nào.",
      "Ra đời từ nhu cầu của cộng đồng, Arex tập hợp thông tin sự kiện in-game, tin tức Esports, lịch giải đấu và nội dung cộng đồng vào một nền tảng duy nhất — giúp người chơi không bỏ lỡ bất kỳ cập nhật quan trọng nào.",
    ],
  },
  {
    title: "Nội dung chúng tôi cung cấp",
    content: [
      "Tin tức sự kiện: Cập nhật nhanh nhất các sự kiện in-game Free Fire tại Việt Nam và toàn cầu, bao gồm sự kiện thường niên, sự kiện theo mùa và các cập nhật OB mới nhất.",
      "Lịch sự kiện: Tổng hợp lịch tất cả sự kiện đang diễn ra và sắp diễn ra, phân loại theo server (Việt Nam, Global, SEA...) giúp người chơi dễ dàng theo dõi.",
      "Esports & Giải đấu: Thông tin về các giải đấu Free Fire từ cấp độ cộng đồng đến chuyên nghiệp. Hệ thống quản lý giải đấu (TMS) tích hợp cho phép tổ chức và theo dõi kết quả trực tiếp.",
      "Tin tức Cộng đồng: Chia sẻ thông tin, góc nhìn và trải nghiệm từ cộng đồng người chơi Free Fire Việt Nam.",
    ],
  },
  {
    title: "Sứ mệnh của Arex",
    content: [
      "Chúng tôi tin rằng mọi người chơi xứng đáng được tiếp cận thông tin chất lượng cao, trung thực và kịp thời về trò chơi mình yêu thích. Arex được xây dựng trên nguyên tắc: thông tin phải chính xác, rõ ràng và dễ tiếp cận với tất cả mọi người.",
      "Không có quảng cáo misleading, không phóng đại thông tin, không spam. Chúng tôi cam kết duy trì nền tảng sạch, chuyên nghiệp và thực sự hữu ích cho cộng đồng.",
    ],
  },
  {
    title: "Cam kết chất lượng",
    content: [
      "Mọi nội dung trên Arex được kiểm duyệt kỹ lưỡng trước khi xuất bản. Chúng tôi luôn ghi rõ nguồn gốc hình ảnh và tuân thủ quy định về bản quyền theo Luật Sở hữu Trí tuệ Việt Nam.",
      "Dữ liệu người dùng được bảo vệ theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân. Chúng tôi không thu thập thông tin không cần thiết và không chia sẻ dữ liệu cho bên thứ ba vì mục đích thương mại.",
      "Nền tảng sử dụng công nghệ hiện đại: Next.js 15, Supabase, và được triển khai trên Vercel với tiêu chuẩn bảo mật cao — đảm bảo tốc độ, ổn định và an toàn cho người dùng.",
    ],
  },
  {
    title: "Tuyên bố miễn trừ trách nhiệm",
    content: [
      "Arex Network là dự án phi lợi nhuận, hoạt động độc lập và không có liên kết chính thức với Garena, Sea Limited hay bất kỳ đơn vị phát hành game nào. Tất cả nhãn hiệu, hình ảnh game và tài sản trực quan thuộc sở hữu của các chủ sở hữu tương ứng.",
      "Hình ảnh sự kiện và nhân vật được lấy từ kênh chính thức của Garena Free Fire, sử dụng cho mục đích thông tin và được ghi nguồn rõ ràng theo quy định pháp luật Việt Nam.",
    ],
  },
];

const LINKS = [
  { label: "Tin Tức", href: "/news", desc: "Cập nhật mới nhất về Free Fire" },
  { label: "Sự Kiện", href: "/events", desc: "Tất cả sự kiện in-game" },
  { label: "Esports", href: "/esports", desc: "Stream & giải đấu trực tiếp" },
  { label: "Liên Hệ", href: "/contact", desc: "Góp ý, hợp tác với chúng tôi" },
  { label: "Chính Sách Bảo Mật", href: "/privacy-policy", desc: "Bảo vệ dữ liệu của bạn" },
  { label: "Điều Khoản Sử Dụng", href: "/terms-of-use", desc: "Quy tắc sử dụng nền tảng" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-14 space-y-10">
      {/* Hero */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-8 md:p-12 text-center space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Về Chúng Tôi</p>
        <h1 className="font-heading text-4xl font-black uppercase tracking-[0.06em] text-foreground md:text-5xl">
          Arex Network
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Cổng thông tin cộng đồng <strong className="text-foreground">Free Fire</strong> độc lập tại Việt Nam — do người chơi xây dựng, dành cho người chơi.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {["Độc lập", "Phi lợi nhuận", "Cộng đồng", "Miễn phí"].map((tag) => (
            <span key={tag} className="rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-semibold text-primary">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map(({ label, value, desc }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 text-center space-y-1">
            <p className="font-heading text-3xl font-black text-primary">{value}</p>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
          </div>
        ))}
      </div>

      {/* Content sections */}
      <div className="space-y-8">
        {SECTIONS.map(({ title, content }) => (
          <section key={title} className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
            <h2 className="font-heading text-xl font-bold uppercase tracking-[0.06em] text-foreground md:text-2xl">
              {title}
            </h2>
            <div className="space-y-3">
              {content.map((para, i) => (
                <p key={i} className="text-base leading-relaxed text-muted-foreground">
                  {para}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Contact CTA */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8 text-center space-y-4">
        <h2 className="font-heading text-xl font-bold uppercase tracking-[0.06em] text-foreground">
          Liên hệ với chúng tôi
        </h2>
        <p className="text-muted-foreground">
          Có câu hỏi, góp ý hoặc muốn hợp tác? Chúng tôi luôn sẵn sàng lắng nghe.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Gửi Liên Hệ
          </Link>
          <a
            href="mailto:admin@arex.tech"
            className="inline-flex items-center rounded-xl border border-border px-6 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            admin@arex.tech
          </a>
        </div>
      </div>

      {/* Navigation links */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-bold uppercase tracking-[0.06em] text-foreground">
          Khám phá Arex
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {LINKS.map(({ label, href, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm space-y-1"
            >
              <p className="text-sm font-bold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground/50 pb-4">
        © {new Date().getFullYear()} Arex Network · Độc lập · Phi thương mại · Cộng đồng Free Fire Việt Nam
      </p>
    </div>
  );
}
