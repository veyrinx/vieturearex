import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Shield, FileText, Send } from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { PageContentOverride } from "@/components/common/page-content-override";

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

const TEAM = [
  {
    name: "Qunzz Dev",
    role: "Founder & Lead Developer",
    desc: "Xây dựng và vận hành nền tảng Arex từ những ngày đầu. Full-stack developer, đam mê Free Fire và cộng đồng gaming Việt Nam.",
    initials: "QD",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    name: "Đội Biên Tập",
    role: "Content & Editorial",
    desc: "Nhóm người chơi tự nguyện phụ trách kiểm duyệt, biên soạn và cập nhật tin tức, sự kiện hàng ngày trên nền tảng.",
    initials: "BT",
    gradient: "from-purple-500 to-pink-600",
  },
  {
    name: "Cộng Đồng",
    role: "Community Contributors",
    desc: "Hơn 50.000 người chơi, người dùng và cộng tác viên đóng góp nội dung, phản hồi và hỗ trợ phát triển Arex mỗi ngày.",
    initials: "CĐ",
    gradient: "from-amber-500 to-orange-600",
  },
];

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email chính thức",
    value: "contact@arexnetwork.site",
    href: "mailto:contact@arexnetwork.site",
    desc: "Hợp tác, báo lỗi, góp ý",
  },
  {
    icon: Send,
    label: "Gửi bài viết",
    value: "Khu vực gửi bài",
    href: "/gui-bai-viet",
    desc: "Đóng góp nội dung cho cộng đồng",
  },
  {
    icon: Shield,
    label: "Chính sách bảo mật",
    value: "Xem chi tiết",
    href: "/privacy-policy",
    desc: "Dữ liệu cá nhân & quyền riêng tư",
  },
  {
    icon: FileText,
    label: "Điều khoản sử dụng",
    value: "Xem chi tiết",
    href: "/terms-of-use",
    desc: "Quy tắc & điều khoản nền tảng",
  },
];

const LINKS = [
  { label: "Tin Tức", href: "/news", desc: "Cập nhật mới nhất về Free Fire" },
  { label: "Sự Kiện", href: "/events", desc: "Tất cả sự kiện in-game" },
  { label: "Esports", href: "/esports", desc: "Stream & giải đấu trực tiếp" },
  { label: "Gửi Bài Viết", href: "/gui-bai-viet", desc: "Đóng góp nội dung cộng đồng" },
  { label: "Chính Sách Bảo Mật", href: "/privacy-policy", desc: "Bảo vệ dữ liệu của bạn" },
  { label: "Điều Khoản Sử Dụng", href: "/terms-of-use", desc: "Quy tắc sử dụng nền tảng" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-14 space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 md:p-12 text-center space-y-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent dark:from-amber-400/6" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent dark:via-amber-400/40" />
        <p className="relative text-[10px] font-black uppercase tracking-[0.28em] text-primary dark:text-amber-400">Về Chúng Tôi</p>
        <h1 className="relative font-heading text-4xl font-black uppercase tracking-[0.04em] text-foreground md:text-5xl">
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

      <PageContentOverride pageKey="about">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map(({ label, value, desc }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 text-center space-y-1">
            <p className="font-heading text-3xl font-black text-primary dark:text-amber-400">{value}</p>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
          </div>
        ))}
      </div>

      {/* Content sections */}
      <div className="space-y-8">
        {SECTIONS.map(({ title, content }) => (
          <section key={title} className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
              <h2 className="font-heading text-base font-black uppercase tracking-[0.14em] text-primary dark:text-amber-400">
                {title}
              </h2>
            </div>
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

      {/* Team */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
          <h2 className="font-heading text-base font-black uppercase tracking-[0.14em] text-primary dark:text-amber-400">
            Đội ngũ quản trị
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {TEAM.map(({ name, role, desc, initials, gradient }) => (
            <div key={name} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className={`inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-sm font-black text-white`}>
                {initials}
              </div>
              <div>
                <p className="font-heading text-sm font-black text-foreground">{name}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary dark:text-amber-400">{role}</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
          <h2 className="font-heading text-base font-black uppercase tracking-[0.14em] text-primary dark:text-amber-400">
            Liên hệ & Chính sách
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTACT_INFO.map(({ icon: Icon, label, value, href, desc }) => (
            <Link
              key={label}
              href={href}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-amber-400/10">
                <Icon className="size-4 text-primary dark:text-amber-400" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">{label}</p>
                <p className="text-sm font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Navigation links */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-black uppercase tracking-[0.06em] text-foreground">
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

      </PageContentOverride>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground/50 pb-4">
        © {new Date().getFullYear()} Arex Network · Độc lập · Phi thương mại · Cộng đồng Free Fire Việt Nam
      </p>
    </div>
  );
}
