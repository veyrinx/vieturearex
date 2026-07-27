import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV !== "production";

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compress: true,
  compiler: {
    removeConsole: isDevelopment ? false : { exclude: ["error"] },
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "dl.dir.freefiremobile.com",
      },
      {
        protocol: "https",
        hostname: "dl.gmc.freefiremobile.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "files.garena.vn",
      },
      {
        protocol: "https",
        hostname: "*.garena.vn",
      },
    ],
    minimumCacheTTL: 31536000,
    formats: ['image/avif', 'image/webp'],
  },
  // Slug tiếng Việt cũ → slug tiếng Anh. Next khớp theo thứ tự nên luật con
  // (loai, so-sanh, vai-tro…) phải đứng trước luật cha :path*.
  async redirects() {
    const move = (source, destination) => ({ source, destination, permanent: true });
    return [
      move("/vu-khi/loai/:path*", "/weapons/types/:path*"),
      move("/vu-khi/so-sanh", "/weapons/compare"),
      move("/vu-khi/:path*", "/weapons/:path*"),
      move("/vu-khi", "/weapons"),
      move("/nhan-vat-mien-phi", "/free-characters"),
      move("/nhan-vat/so-sanh", "/characters/compare"),
      move("/nhan-vat/vai-tro/:path*", "/characters/roles/:path*"),
      move("/nhan-vat/:path*", "/characters/:path*"),
      move("/nhan-vat", "/characters"),
      move("/cong-dong/xu-huong", "/community/trending"),
      move("/cong-dong/:path*", "/community/:path*"),
      move("/cong-dong", "/community"),
      move("/wiki/tao-bai", "/wiki/create"),
      move("/wiki/:slug/chinh-sua", "/wiki/:slug/edit"),
      move("/binh-chon", "/character-poll"),
      move("/bxh-nick-vn", "/top-players-vn"),
      move("/bxh-quiz", "/quiz-leaderboard"),
      move("/cap-nhat", "/changelog"),
      move("/cong-cu", "/tools"),
      move("/cua-hang-prime", "/prime-store"),
      move("/dang-cap-nhat", "/updating"),
      move("/dang-hot", "/trending"),
      move("/dang-ky-tin", "/newsletter"),
      move("/dem-nguoc", "/countdown"),
      move("/dinh-gia-nick", "/account-value"),
      move("/do-nhay", "/sensitivity"),
      move("/giai-dau-cong-dong", "/community-tournaments"),
      move("/gui-bai-viet", "/submit-article"),
      move("/hop-tac", "/partnership"),
      move("/lich-noi-dung", "/content-roadmap"),
      move("/lien-ket-telegram", "/telegram-link"),
      move("/nap-an-toan", "/safe-topup"),
      move("/sap-ra-mat", "/coming-soon"),
      move("/so-sanh-nick", "/player-compare"),
      move("/tao-ten", "/name-generator"),
      move("/tinh-kd", "/kd-calculator"),
      move("/tinh-nap", "/topup-calculator"),
      move("/tra-cuu-guild", "/guild-lookup"),
      move("/tra-cuu-nick", "/player-lookup"),
      move("/trang-thai", "/server-status"),
      move("/tuyen-thanh-vien", "/recruitment"),
      move("/yeu-thich", "/favorites"),
      move("/embed/bxh-nick-vn", "/embed/top-players-vn"),
      // Telegram Mini App
      move("/tg/giai-dau", "/tg/tournaments"),
      move("/tg/su-kien", "/tg/events"),
      move("/tg/tin-tuc", "/tg/news"),
    ];
  },
  async headers() {
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://va.vercel-scripts.com",
      // Google Dịch (widget nhúng element.js)
      "https://translate.google.com",
      "https://translate.googleapis.com",
      // el_main tải thêm JSONP danh sách ngôn ngữ từ translate-pa (trong iframe srcdoc)
      "https://translate-pa.googleapis.com",
      "https://www.gstatic.com",
      // Google AdSense (loader + script phụ trợ)
      "https://pagead2.googlesyndication.com",
      "https://*.googlesyndication.com",
      "https://partner.googleadservices.com",
      "https://www.googletagservices.com",
      "https://adservice.google.com",
      "https://tpc.googlesyndication.com",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ].join(" ");

    const connectSrc = [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://www.googleapis.com",
      "https://i.ytimg.com",
      "https://www.youtube-nocookie.com",
      "https://www.google-analytics.com",
      "https://region1.google-analytics.com",
      "https://vitals.vercel-insights.com",
      "https://va.vercel-scripts.com",
      "wss://*.twitch.tv",
      "https://*.twitch.tv",
      // Google Dịch gọi API dịch từ trình duyệt
      "https://translate.googleapis.com",
      "https://translate-pa.googleapis.com",
      "https://translate.google.com",
      "https://www.gstatic.com",
      // Google AdSense (beacon / đo lường chất lượng quảng cáo)
      "https://pagead2.googlesyndication.com",
      "https://*.googlesyndication.com",
      "https://googleads.g.doubleclick.net",
      "https://*.g.doubleclick.net",
      "https://*.adtrafficquality.google",
      "https://adservice.google.com",
      "https://www.google.com",
    ].join(" ");

    // Google Dịch nạp CSS/font của widget từ gstatic + translate.googleapis.com.
    const styleSrc = [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://www.gstatic.com",
      "https://translate.googleapis.com",
    ].join(" ");

    const fontSrc = [
      "'self'",
      "data:",
      "https://fonts.gstatic.com",
      "https://www.gstatic.com",
    ].join(" ");

    const frameSrc = [
      "'self'",
      // AdSense/SafeFrame dựng iframe cục bộ từ blob:
      "blob:",
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
      "https://player.twitch.tv",
      "https://www.twitch.tv",
      "https://www.facebook.com",
      "https://web.facebook.com",
      "https://www.tiktok.com",
      "https://translate.google.com",
      "https://googleads.g.doubleclick.net",
      "https://pagead2.googlesyndication.com",
      "https://tpc.googlesyndication.com",
      "https://*.googlesyndication.com",
      "https://*.doubleclick.net",
      "https://www.google.com",
      "https://*.adtrafficquality.google",
    ].join(" ");

    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      `font-src ${fontSrc}`,
      `style-src ${styleSrc}`,
      `script-src ${scriptSrc}`,
      `connect-src ${connectSrc}`,
      `frame-src ${frameSrc}`,
      "form-action 'self' https://mail.google.com https://accounts.google.com",
      "upgrade-insecure-requests",
    ].join("; ");

    // CSP for /embed paths: cho phép BẤT KỲ site nào nhúng iframe (widget công khai).
    const embedContentSecurityPolicy = contentSecurityPolicy.replace(
      "frame-ancestors 'self'",
      "frame-ancestors *",
    );

    // CSP for /tg paths: allow Telegram to embed in iframe and load SDK
    const tgScriptSrc = [scriptSrc, "https://telegram.org"].join(" ");
    const tgConnectSrc = [connectSrc, "https://telegram.org"].join(" ");
    const tgContentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self' https://t.me https://web.telegram.org https://telegram.org",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      `font-src ${fontSrc}`,
      `style-src ${styleSrc}`,
      `script-src ${tgScriptSrc}`,
      `connect-src ${tgConnectSrc}`,
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      // Block .map files entirely (belt-and-suspenders after productionBrowserSourceMaps:false)
      {
        source: "/:path*.map",
        headers: [{ key: "X-Robots-Tag", value: "none" }],
      },
      // CORS for ALL /api/* — lets the Zalo/Telegram Mini App (different origin)
      // call our API (incl. Authorization: Bearer). Applied at the framework level
      // so it covers every route + Next's auto OPTIONS preflight, without relying
      // on middleware (which doesn't run on /api in this deployment).
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "authorization, content-type, accept, x-telegram-init-data" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
      // Admin + auth routes: no indexing, no cache
      {
        source: "/(admin|auth)/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      // Admin API: never cache, no indexing
      {
        source: "/api/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      // Thin content / utility pages: noindex to improve AdSense content quality score
      {
        source: "/(login|register|setup|join|profile|favorites|search|maintenance)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/players/compare",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/u/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
      {
        source: "/teams/:id/join",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/tournaments/:slug/(submit|register)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/tournaments/my-team",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
      // Legacy redirect aliases: noindex to avoid duplicate content
      {
        source: "/(tin-tuc|su-kien|lich)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
      {
        source: "/(tin-tuc|su-kien|lich|chinh-sach-bao-mat|dieu-khoan-su-dung)",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      // Embed widgets: cho phép nhúng iframe từ mọi nơi (override /:path* ở trên).
      {
        source: "/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: embedContentSecurityPolicy },
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      // Telegram Mini App: allow framing from Telegram domains
      {
        source: "/tg/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: tgContentSecurityPolicy,
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "unsafe-none",
          },
          {
            // Allow YouTube embed features (autoplay, fullscreen, picture-in-picture)
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), autoplay=*, fullscreen=*, picture-in-picture=*, encrypted-media=*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
