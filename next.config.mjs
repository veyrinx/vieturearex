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
  async headers() {
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://va.vercel-scripts.com",
      // Google Translate widget (VI ↔ EN toggle)
      "https://translate.google.com",
      "https://translate.googleapis.com",
      "https://www.gstatic.com",
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
      // Google Translate widget
      "https://translate.googleapis.com",
      "https://translate.google.com",
      "wss://*.twitch.tv",
      "https://*.twitch.tv",
    ].join(" ");

    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      `script-src ${scriptSrc}`,
      `connect-src ${connectSrc}`,
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.twitch.tv https://www.twitch.tv https://www.facebook.com https://web.facebook.com https://translate.google.com https://www.tiktok.com",
      "form-action 'self' https://mail.google.com https://accounts.google.com",
      "upgrade-insecure-requests",
    ].join("; ");

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
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
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
        source: "/(login|register|setup|join|profile|yeu-thich|search|maintenance)",
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
