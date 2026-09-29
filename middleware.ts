import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionEnvelope } from "@/lib/admin/session-token";

/**
 * FIRST layer of admin route protection (fast, Edge Runtime, no DB call).
 * Rejects requests with no cookie, a forged cookie, or an expired envelope
 * before they ever reach a page or API route.
 *
 * This is intentionally NOT the only layer: every admin page and API route
 * also calls verifyAdminSession() server-side (see lib/auth.ts), which does
 * the authoritative database check (revocation, idle timeout, "log out all
 * sessions"). Two independent layers are used specifically because a bug
 * class exists (CVE-2025-29927) where a crafted request header could skip
 * Next.js middleware entirely on unpatched versions — relying on middleware
 * alone would have been a single point of failure. This project's Next.js
 * version has since been patched (see SECURITY_AUDIT_REPORT.md), and the
 * second layer means even a middleware bypass would still hit a real
 * authorization check at the route/page level.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isControlPanelPath = pathname.startsWith("/admin/control-panel");

  // /admin/login and /admin/forgot-password must both be reachable WITHOUT
  // a session cookie — that's the entire point of a login page and a
  // password-recovery page. (Pre-existing gap: /admin/forgot-password was
  // previously caught by the generic "/admin/*" match below, which would
  // have redirected a locked-out admin straight back to /admin/login
  // before the recovery flow could ever run. Fixed here, since it directly
  // blocks the forgot-password feature this project depends on.)
  const isPublicAdminPath = pathname === "/admin/login" || pathname === "/admin/forgot-password";

  const isProtectedAdminPath =
    pathname.startsWith("/admin") && !isPublicAdminPath && !isControlPanelPath;

  if (isProtectedAdminPath) {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const envelope = await verifySessionEnvelope(token);
    if (!envelope) {
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  const isProtectedControlPanelPath = isControlPanelPath;

  if (isProtectedControlPanelPath) {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const envelope = await verifySessionEnvelope(token);
    if (!envelope) {
      // Generic 404 for the control panel specifically: it is more
      // sensitive than the ordinary admin panel, so an unauthenticated
      // request gets a plain "not found" rather than a redirect that would
      // confirm a login page exists at this path.
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
