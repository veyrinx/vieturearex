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
  compiler: {
    removeConsole: isDevelopment ? false : { exclude: ["error"] },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    };
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
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ].join(" ");

    const connectSrc = [
      "'self'",
      "https://*.supabase.co",
      "https://www.googleapis.com",
      "https://i.ytimg.com",
      "https://www.youtube-nocookie.com",
      "https://www.google-analytics.com",
      "https://region1.google-analytics.com",
      "https://vitals.vercel-insights.com",
      "https://va.vercel-scripts.com",
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
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.twitch.tv https://www.twitch.tv https://www.facebook.com https://web.facebook.com",
      "form-action 'self' https://mail.google.com https://accounts.google.com",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      // Block .map files entirely (belt-and-suspenders after productionBrowserSourceMaps:false)
      {
        source: "/:path*.map",
        headers: [{ key: "X-Robots-Tag", value: "none" }],
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
    ];
  },
};

export default nextConfig;
