"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps every route so navigating anywhere on the site feels intentional:
 * a thin gold shimmer sweeps across the top of the viewport (`.route-sweep`)
 * while the new page fades in, un-blurs and settles upward (`.page-enter`).
 * Both effects are re-triggered by the `key={pathname}` remount and are pure
 * CSS keyframes — no JS animation loop, and both back off automatically
 * under `prefers-reduced-motion`.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <div key={`sweep-${pathname}`} className="route-sweep" />
      <div key={pathname} className="page-enter">
        {children}
      </div>
    </>
  );
}
