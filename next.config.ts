import type { NextConfig } from "next";

// Header di sicurezza applicati a ogni risposta. Tenuti qui (non in vercel.json)
// così valgono anche con `next start` in locale e su qualsiasi host.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // La home dell'utente è un repo git con un package-lock: senza questo Next
  // risalirebbe fino a /Users/apple cercando la root del workspace.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
