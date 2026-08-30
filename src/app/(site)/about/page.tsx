import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Mail, Shield, FileText, Send, Newspaper, Globe2, Users, Trophy, Store, Handshake, Lock,
  Building2, CalendarDays, MapPin, Link2, ArrowRight,
} from "lucide-react";
import { siteConfig } from "@/lib/constants/site";
import { PageContentOverride } from "@/components/common/page-content-override";
import { ContactInfo } from "@/components/common/contact-info";
import { getSettings, getAdminProfiles } from "@/lib/data/content-service";
import { buildSettingsMap } from "@/lib/utils/site-settings";
import { getRoleMeta } from "@/lib/constants/roles";
import type { PublicUserProfile } from "@/lib/types/content";

export const metadata: Metadata = {
  title: "Về Chúng Tôi",
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

// Số liệu do admin nhập ở /admin/settings → Giới Thiệu. Giá trị mặc định nằm
// trong defaultSiteSettingValues; xoá trắng ô trong admin thì ô đó bị ẩn.
const STATS = [
  { key: "about.stat_articles", label: "Bài viết tin tức",    desc: "Tin tức Free Fire cập nhật liên tục" },
  { key: "about.stat_events",   label: "Sự kiện theo dõi",    desc: "Lịch sự kiện in-game đầy đủ" },
  { key: "about.stat_views",    label: "Lượt xem hàng tháng", desc: "Người chơi tin tưởng Arex" },
  { key: "about.stat_years",    label: "Năm hoạt động",       desc: "Đồng hành cùng cộng đồng Free Fire" },
];

// ── Mô hình hoạt động của Arex Network Global ──────────────────────────────
// Chỉ mô tả ở mức nghiệp vụ. Tuyệt đối không nêu tên API, endpoint, nhà cung
// cấp hạ tầng, cấu trúc dữ liệu hay bất kỳ chi tiết kỹ thuật nội bộ nào.
const MODEL_PILLARS = [
  {
    icon: Newspaper,
    title: "Trung tâm nội dung",
    desc: "Đội biên tập theo dõi các kênh chính thức và nguồn tin uy tín mỗi ngày, biên soạn lại bằng tiếng Việt, gắn nguồn rõ ràng rồi mới đưa lên nền tảng.",
  },
  {
    icon: Globe2,
    title: "Một nội dung, nhiều điểm chạm",
    desc: "Cùng một nội dung đã duyệt được đưa tới website, ứng dụng di động, mini app trên các nền tảng nhắn tin và các nhóm cộng đồng — người chơi ở đâu cũng nhận được cùng một thông tin.",
  },
  {
    icon: Users,
    title: "Cộng đồng đồng vận hành",
    desc: "Người chơi gửi bài, báo lỗi, đề xuất chủ đề; cộng tác viên và quản trị viên được cấp vai trò theo đúng phạm vi công việc, mỗi vai chỉ thấy phần việc của mình.",
  },
  {
    icon: Trophy,
    title: "Giải đấu & Esports",
    desc: "Hỗ trợ ban tổ chức mở giải cộng đồng: nhận đăng ký đội, xếp lịch thi đấu, ghi nhận kết quả và công bố bảng xếp hạng công khai cho người xem theo dõi.",
  },
  {
    icon: Store,
    title: "Chợ & dịch vụ cộng đồng",
    desc: "Gian hàng do người bán được xác minh vận hành, có quy tắc kiểm duyệt và cảnh báo lừa đảo. Thông tin nhạy cảm của người mua và người bán luôn được che bớt trước khi hiển thị.",
  },
  {
    icon: Handshake,
    title: "Hợp tác & đối tác",
    desc: "Đồng hành cùng đội tuyển, nhà sáng tạo nội dung và các đơn vị cùng lĩnh vực theo thỏa thuận hợp tác rõ ràng, có văn bản, dựa trên trao đổi giá trị chứ không mua bán dữ liệu.",
  },
];

const MODEL_FLOW = [
  { step: "01", title: "Thu thập", desc: "Ghi nhận tin tức, sự kiện, kết quả giải đấu từ nguồn chính thức và từ cộng đồng." },
  { step: "02", title: "Kiểm duyệt", desc: "Đối chiếu nguồn, biên tập lại nội dung, loại bỏ tin sai lệch trước khi đăng." },
  { step: "03", title: "Xuất bản", desc: "Đưa nội dung ra toàn bộ kênh của Arex cùng lúc, kèm thông báo cho người theo dõi." },
  { step: "04", title: "Lắng nghe", desc: "Nhận phản hồi, đính chính khi cần và dùng dữ liệu tổng hợp để cải thiện nội dung kỳ sau." },
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
      "Hạ tầng vận hành được đặt tại các nhà cung cấp uy tín quốc tế, có sao lưu định kỳ và giám sát liên tục. Vì lý do an toàn, chúng tôi không công bố chi tiết kỹ thuật, cấu trúc hệ thống hay các kết nối nội bộ của nền tảng.",
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

/** Bản dự phòng khi chưa bật đội ngũ thật (hoặc chưa ai bật hiện trên trang đội ngũ). */
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
    href: "/submit-article",
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
  { label: "Gửi Bài Viết", href: "/submit-article", desc: "Đóng góp nội dung cộng đồng" },
  { label: "Chính Sách Bảo Mật", href: "/privacy-policy", desc: "Bảo vệ dữ liệu của bạn" },
  { label: "Điều Khoản Sử Dụng", href: "/terms-of-use", desc: "Quy tắc sử dụng nền tảng" },
];

/** Một dòng mô tả cho thẻ quản trị viên: chức danh + mảng phụ trách. */
function memberLine(p: PublicUserProfile): string {
  const duties = (p.team_duties ?? []).filter(Boolean);
  if (duties.length) return `Phụ trách ${duties.slice(0, 3).join(", ").toLowerCase()}.`;
  return p.team_focus?.trim() || p.bio?.trim() || "Thành viên ban quản trị Arex Network.";
}

export default async function AboutPage() {
  // Trang công khai: chỉ đọc phần cài đặt giới thiệu và hồ sơ quản trị đã bật
  // "hiện trên trang đội ngũ". Không chạm tới bất kỳ khoá hay cấu hình nội bộ nào.
  const [settings, profiles] = await Promise.all([
    getSettings().catch(() => []),
    getAdminProfiles().catch(() => [] as PublicUserProfile[]),
  ]);
  const map = buildSettingsMap(settings);
  const val = (k: string) => (map[k] ?? "").trim();

  const orgName = val("about.org_name") || "Arex Network Global";
  const orgTagline = val("about.org_tagline");
  const stats = STATS.map((s) => ({ ...s, value: val(s.key) })).filter((s) => s.value);

  const orgFacts = [
    { icon: Building2,    label: "Tên tổ chức",       value: orgName },
    { icon: CalendarDays, label: "Năm thành lập",     value: val("about.founded_year") },
    { icon: Users,        label: "Đơn vị vận hành",   value: val("about.operator") },
    { icon: MapPin,       label: "Phạm vi hoạt động", value: val("about.scope") },
    { icon: Link2,        label: "Tên miền chính thức", value: siteConfig.url.replace(/^https?:\/\//, "") },
    { icon: Mail,         label: "Email liên hệ",     value: val("social.email") || siteConfig.contactEmail },
  ].filter((f) => f.value);

  const showTeam = val("about.show_team") !== "false";
  const teamLimit = Math.min(24, Math.max(1, Number(val("about.team_limit")) || 6));
  const team = showTeam ? profiles.slice(0, teamLimit) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-14 space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 md:p-12 text-center space-y-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent dark:from-amber-400/6" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent dark:via-amber-400/40" />
        <p className="relative text-[10px] font-black uppercase tracking-[0.28em] text-primary dark:text-amber-400">Về Chúng Tôi</p>
        <h1 className="relative font-heading text-4xl font-black uppercase tracking-[0.04em] text-foreground md:text-5xl">
          {orgName}
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
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map(({ label, value, desc }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 text-center space-y-1">
              <p className="font-heading text-3xl font-black text-primary dark:text-amber-400">{value}</p>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Hồ sơ tổ chức — nội dung do admin nhập ở /admin/settings → Giới Thiệu */}
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
          <h2 className="font-heading text-base font-black uppercase tracking-[0.14em] text-primary dark:text-amber-400">
            Hồ sơ tổ chức
          </h2>
        </div>
        {orgTagline && <p className="text-base leading-relaxed text-muted-foreground">{orgTagline}</p>}
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {orgFacts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                <Icon className="size-4 text-primary dark:text-amber-400" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">{label}</p>
                <p className="truncate text-sm font-bold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mô hình hoạt động */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
          <h2 className="font-heading text-base font-black uppercase tracking-[0.14em] text-primary dark:text-amber-400">
            Mô hình hoạt động của {orgName}
          </h2>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          {orgName} vận hành như một mạng lưới cộng đồng: một trung tâm nội dung duy nhất, nhiều kênh phân phối
          và một cộng đồng người chơi cùng đóng góp. Dưới đây là cách các mảnh ghép đó làm việc với nhau.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {MODEL_PILLARS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 dark:bg-amber-400/10">
                <Icon className="size-4 text-primary dark:text-amber-400" />
              </span>
              <p className="font-heading text-sm font-black text-foreground">{title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* Vòng vận hành */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5">
          <p className="font-heading text-sm font-black uppercase tracking-[0.12em] text-foreground">
            Một nội dung đi qua bốn bước
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODEL_FLOW.map(({ step, title, desc }) => (
              <div key={step} className="space-y-1.5">
                <p className="font-heading text-2xl font-black text-primary/30 dark:text-amber-400/30">{step}</p>
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ranh giới thông tin */}
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-muted/30 p-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-amber-400/10">
            <Lock className="size-4 text-primary dark:text-amber-400" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">Chúng tôi công khai cách làm, không công khai cách vận hành bên trong</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Arex chia sẻ minh bạch quy trình và nguyên tắc làm việc, nhưng không công bố chi tiết kỹ thuật của hệ thống:
              không có địa chỉ dịch vụ nội bộ, khóa truy cập, cấu trúc dữ liệu hay quy trình xử lý phía sau. Đây là biện pháp
              bảo vệ tài khoản và dữ liệu của chính người dùng. Đối tác cần kết nối kỹ thuật vui lòng liên hệ qua email chính
              thức để được trao đổi riêng.
            </p>
          </div>
        </div>
      </section>

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

      {/* Team — hồ sơ thật của ban quản trị, sửa ở /admin/team */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-0.5 rounded-full bg-primary dark:bg-amber-400" />
            <h2 className="font-heading text-base font-black uppercase tracking-[0.14em] text-primary dark:text-amber-400">
              Đội ngũ quản trị
            </h2>
          </div>
          {team.length > 0 && (
            <Link
              href="/team"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline dark:text-amber-400"
            >
              Toàn bộ đội ngũ <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>

        {team.length > 0 ? (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Người thật, tên thật, có hồ sơ công khai — bạn biết chính xác ai đang vận hành nền tảng và ai phụ trách mảng nào.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((p) => {
                const meta = getRoleMeta(p.role);
                const RoleIcon = meta.icon;
                const name = p.display_name ?? "Thành viên";
                return (
                  <Link
                    key={p.id}
                    href={`/u/${p.id}`}
                    className="group rounded-2xl border border-border bg-card p-5 space-y-3 transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`relative size-11 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${meta.gradient}`}>
                        {p.avatar_url ? (
                          <Image src={p.avatar_url} alt={name} fill sizes="44px" className="object-cover" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-sm font-black text-white">
                            {name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-heading text-sm font-black text-foreground">{name}</p>
                        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-primary dark:text-amber-400">
                          {p.team_title || meta.label}
                        </p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${meta.color} ${meta.border}`}>
                      <RoleIcon className="size-3" />
                      {meta.label}
                    </span>

                    <p className="text-xs leading-relaxed text-muted-foreground">{memberLine(p)}</p>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
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
        )}
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

      {/* Kết nối mạng xã hội — luôn hiển thị, đọc từ cài đặt */}
      <section className="space-y-4">
        <h2 className="font-heading text-lg font-black uppercase tracking-[0.06em] text-foreground">
          Kết nối với chúng tôi
        </h2>
        <ContactInfo />
      </section>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground/50 pb-4">
        © {new Date().getFullYear()} Arex Network · Độc lập · Phi thương mại · Cộng đồng Free Fire Việt Nam
      </p>
    </div>
  );
}
