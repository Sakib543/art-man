import type { NextConfig } from "next";

/**
 * Sent with every response (P7.17, QA-35). No page of this app is meant to be
 * shown inside another site's frame, to have its type guessed, or to hand its
 * address to the next site. The policy names only what it needs: it does not
 * limit scripts or styles — Next's own inline scripts would need a nonce per
 * request — so it is the frame, form and base rules alone. The session cookie
 * is SameSite=Lax already; this is hardening on top.
 */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'" },
  // For browsers that predate frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // "X-Powered-By: Next.js" told every visitor what to look up advisories for.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        // The service worker (P2.2a) must never be served from an HTTP cache,
        // or a fixed worker would reach the counter a day late.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
