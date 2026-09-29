"use client";

import { useEffect, useRef } from "react";

/**
 * Site-wide decorative atmosphere.
 *
 * Renders once in the root layout, fixed behind every page (z-index -10).
 * Pure CSS + inline SVG — no images. Every animated property is
 * transform/opacity only (GPU-friendly). `prefers-reduced-motion` is fully
 * respected via app/globals.css.
 *
 * The only JS here is a single rAF-throttled `scroll` listener (not a loop —
 * it only fires on the scroll event) that writes the scroll position to a
 * CSS variable, so the three depth layers (orbs / ribbon / particles) drift
 * at different speeds as the visitor scrolls — a subtle parallax that makes
 * the backdrop feel alive instead of static.
 *
 * Purely decorative: aria-hidden, pointer-events disabled, never affects
 * layout or interaction, and sits at low opacity so text everywhere
 * (including Privacy Policy / Terms pages) stays fully readable.
 */
export default function AmbientBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        el.style.setProperty("--scroll-y", String(window.scrollY));
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Deterministic "random" particle layout so server and client render
  // identical markup (no hydration mismatch from Math.random()).
  const particles = [
    { top: "8%", left: "12%", size: 3, dur: 14, delay: 0 },
    { top: "18%", left: "78%", size: 4, dur: 17, delay: 1.5 },
    { top: "30%", left: "45%", size: 2, dur: 12, delay: 3 },
    { top: "42%", left: "88%", size: 3, dur: 19, delay: 0.8 },
    { top: "55%", left: "6%", size: 4, dur: 15, delay: 2.2 },
    { top: "64%", left: "60%", size: 2, dur: 13, delay: 4 },
    { top: "72%", left: "25%", size: 3, dur: 18, delay: 1 },
    { top: "85%", left: "80%", size: 3, dur: 16, delay: 2.8 },
    { top: "92%", left: "40%", size: 2, dur: 20, delay: 0.4 },
    { top: "25%", left: "20%", size: 2, dur: 21, delay: 3.6 },
  ];

  const sparkles = [
    { top: "14%", left: "68%", size: 10, dur: 6, delay: 0 },
    { top: "48%", left: "10%", size: 8, dur: 7, delay: 2 },
    { top: "76%", left: "88%", size: 9, dur: 5.5, delay: 1 },
    { top: "88%", left: "22%", size: 7, dur: 6.5, delay: 3.2 },
  ];

  return (
    <div className="ambient-root" aria-hidden="true" ref={rootRef}>
      {/* Depth layer 1 (slowest drift): the big soft light orbs */}
      <div className="ambient-parallax-slow">
        <div className="ambient-orb ambient-orb-a" />
        <div className="ambient-orb ambient-orb-b" />
        <div className="ambient-orb ambient-orb-c" />
      </div>

      {/* Depth layer 2 (mid drift): flowing silk/ribbon-like curves, very low opacity */}
      <div className="ambient-parallax-mid">
        <svg
          className="ambient-ribbon"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M -100 620 C 250 500, 450 720, 750 560 S 1150 420, 1300 520"
            fill="none"
            stroke="#E4CB9C"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
          />
          <path
            d="M -100 180 C 200 260, 500 60, 800 220 S 1100 300, 1300 200"
            fill="none"
            stroke="#C98D8A"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.22"
          />
          <path
            d="M -50 420 C 300 380, 600 480, 900 400 S 1150 360, 1300 400"
            fill="none"
            stroke="#C9A876"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.28"
          />
        </svg>
      </div>

      {/* Depth layer 3 (fastest drift): delicate floating pearls + sparkles */}
      <div className="ambient-parallax-fast">
        {particles.map((p, i) => (
          <span
            key={i}
            className="ambient-particle"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}

        {sparkles.map((s, i) => (
          <svg
            key={i}
            className="ambient-sparkle"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="#E4CB9C" />
          </svg>
        ))}
      </div>
    </div>
  );
}
