"use client";

import { useEffect, useRef } from "react";

const VARIANT_CLASS = {
  up: "reveal",
  scale: "reveal-scale",
  left: "reveal-left",
  right: "reveal-right",
} as const;

// Hard ceiling on how long content can stay in its pre-animation (opacity:0)
// state. Under normal conditions the IntersectionObserver reveals the
// element the moment it scrolls into view, well under this. This timer only
// matters as a safety net for the cases where the observer never fires —
// unsupported browser, a hydration timing race, or an element whose layout
// shifted (e.g. while an image above it finished loading) so the observer
// missed its entry. Real, functional content must never be permanently
// invisible just because a scroll-in animation didn't get to run.
const REVEAL_FALLBACK_MS = 1200;

export default function ScrollReveal({
  children,
  className,
  delay = 0,
  variant = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Entrance style: "up" (default fade+rise), "scale" (fade+zoom, good for cards/hero art), "left"/"right" (slide in from the side, good for alternating rows). */
  variant?: keyof typeof VARIANT_CLASS;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => el.classList.add("in-view");

    // No IntersectionObserver support (very old browsers, some crawlers) —
    // just show the content immediately rather than hiding it forever.
    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    let revealed = false;
    const safeReveal = () => {
      if (revealed) return;
      revealed = true;
      reveal();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(safeReveal, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);

    // Safety net: guarantee visibility within a bounded time no matter what
    // the observer does. This never fires under normal scroll-driven use —
    // it only kicks in if the observer never reported an intersection.
    const fallback = setTimeout(safeReveal, REVEAL_FALLBACK_MS + delay);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [delay]);

  return (
    <div ref={ref} className={`${VARIANT_CLASS[variant]} ${className ?? ""}`}>
      {children}
    </div>
  );
}
