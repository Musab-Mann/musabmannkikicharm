/** @type {import('next').NextConfig} */
const nextConfig = {
 images: {
  remotePatterns: [
    { protocol: "https", hostname: "*.supabase.co" },
  ],
  unoptimized: true,
},
  // Disable build-time font optimisation so Google Fonts <link> tags load
  // normally at runtime (avoids fetch errors in CI environments without
  // access to fonts.googleapis.com).
  

  async headers() {
    // NOTE on script-src/style-src 'unsafe-inline': Next.js 14's App Router
    // injects inline hydration data and Tailwind/Next inject some inline
    // styles at runtime. Removing 'unsafe-inline' requires wiring a
    // per-request nonce through middleware and every layout, which is a
    // real change to test carefully in a real browser (not verifiable in
    // this environment) rather than risk shipping untested — documented
    // here as the known, deliberate exception rather than silently applying
    // a CSP that could break the site. 'unsafe-eval' is NOT included.
    // 'unsafe-eval' is required in `next dev` (webpack's dev-mode source
    // maps and Fast Refresh runtime call eval()); without it the browser's
    // CSP silently blocks the app's own JS, the page renders its initial
    // static HTML, and nothing ever hydrates — every input, button and
    // onChange handler on the page looks "dead" even though the React code
    // is correct (this is what was happening on /admin/login). Production
    // builds do not use eval, so 'unsafe-eval' is scoped to development only
    // and never ships to production.
    const isDev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      // Dev-only: Next.js's Fast Refresh/HMR client connects back over a
      // websocket to the same dev server. Without this, the websocket
      // connection is blocked by CSP and the dev overlay/HMR silently stops
      // working (does not affect the production connect-src).
      `connect-src 'self' https://*.supabase.co${isDev ? " ws: wss:" : ""}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Only meaningful over HTTPS (Vercel serves HTTPS in production);
          // harmless no-op over local HTTP dev.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        // Never let any cache (browser, CDN, Cloudflare) store admin or
        // control-panel responses — these are always per-session and
        // frequently sensitive.
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        source: "/api/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};
module.exports = nextConfig;
