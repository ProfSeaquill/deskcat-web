import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV !== "production";
const googleAnalyticsEnabled = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  ...(googleAnalyticsEnabled ? ["https://www.googletagmanager.com"] : [])
].join(" ");

const imgSrc = [
  "'self'",
  "data:",
  "blob:",
  "https://*.public.blob.vercel-storage.com",
  ...(googleAnalyticsEnabled ? ["https://www.google-analytics.com"] : [])
].join(" ");

const connectSrc = [
  "'self'",
  ...(googleAnalyticsEnabled ? ["https://www.google-analytics.com", "https://*.google-analytics.com"] : [])
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imgSrc}`,
  "font-src 'self' data:",
  "media-src 'self'",
  `connect-src ${connectSrc}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"])
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()"
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload"
        }
      ])
];

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
