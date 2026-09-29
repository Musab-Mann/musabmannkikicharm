/**
 * Decorative, per-card visual treatment for the homepage Featured
 * Collections grid. Purely presentational (aria-hidden, pointer-events
 * disabled) — it never changes the card's link, click behavior, or text.
 * Each variant uses a different combination of CSS gradients / SVG shapes
 * so the six cards feel distinct while sharing one design language.
 */
export default function CollectionCardArt({ index }: { index: number }) {
  const variant = index % 6;

  switch (variant) {
    // Charms — soft glowing orb + floating dots
    case 0:
      return (
        <div className="card-art" aria-hidden="true">
          <div
            className="card-orb"
            style={{ top: "-15%", right: "-10%", width: "60%", height: "60%", background: "radial-gradient(circle, #E4CB9C, transparent 70%)" }}
          />
          <span className="card-dot" style={{ top: "30%", left: "18%", width: 5, height: 5, animationDelay: "0.2s" }} />
          <span className="card-dot" style={{ top: "55%", left: "35%", width: 3, height: 3, animationDelay: "1.1s" }} />
          <span className="card-dot" style={{ top: "22%", left: "55%", width: 4, height: 4, animationDelay: "1.9s" }} />
        </div>
      );

    // Stainless Steel — cool light streaks across a metallic gradient
    case 1:
      return (
        <div className="card-art" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(201,168,118,0.18), rgba(255,255,255,0.05) 45%, rgba(140,122,94,0.20))" }}
          />
          <div className="card-streak" style={{ top: "35%", left: "10%", width: "55%", animationDelay: "0.3s" }} />
          <div className="card-streak" style={{ top: "60%", left: "25%", width: "45%", animationDelay: "1.4s" }} />
        </div>
      );

    // Tools — precise geometric grid + subtle gold corner glow
    case 2:
      return (
        <div className="card-art" aria-hidden="true">
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
              maskImage: "radial-gradient(circle at 70% 30%, black, transparent 70%)",
            }}
          />
          <div
            className="card-orb"
            style={{ bottom: "-20%", left: "-10%", width: "55%", height: "55%", background: "radial-gradient(circle, #C9A876, transparent 70%)", animationDuration: "7s" }}
          />
        </div>
      );

    // Keychains & Table Charms — pearl dots trailing like a keyring
    case 3:
      return (
        <div className="card-art" aria-hidden="true">
          <span className="card-dot" style={{ top: "20%", left: "70%", width: 6, height: 6, animationDelay: "0s" }} />
          <span className="card-dot" style={{ top: "38%", left: "60%", width: 4, height: 4, animationDelay: "0.6s" }} />
          <span className="card-dot" style={{ top: "52%", left: "50%", width: 3, height: 3, animationDelay: "1.2s" }} />
          <span className="card-dot" style={{ top: "64%", left: "40%", width: 2.5, height: 2.5, animationDelay: "1.8s" }} />
          <div
            className="card-orb"
            style={{ top: "10%", right: "5%", width: "40%", height: "40%", background: "radial-gradient(circle, #C98D8A, transparent 70%)", animationDuration: "8s" }}
          />
        </div>
      );

    // Glass & Marble Beads — layered translucent circles (glass depth)
    case 4:
      return (
        <div className="card-art" aria-hidden="true">
          <div
            className="absolute rounded-full"
            style={{ top: "12%", left: "15%", width: "34%", height: "34%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55), rgba(201,168,118,0.15) 60%, transparent 75%)", filter: "blur(1px)" }}
          />
          <div
            className="absolute rounded-full"
            style={{ bottom: "10%", right: "12%", width: "42%", height: "42%", background: "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.4), rgba(201,141,138,0.15) 60%, transparent 75%)", filter: "blur(1px)" }}
          />
          <span className="card-dot" style={{ top: "45%", left: "55%", width: 3, height: 3, animationDelay: "0.9s" }} />
        </div>
      );

    // Trendy Articles — soft organic silhouette + shimmer arc
    default:
      return (
        <div className="card-art" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 200 150" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M -10 100 C 40 60, 90 130, 140 80 S 210 40, 220 60"
              fill="none"
              stroke="#E4CB9C"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div
            className="card-orb"
            style={{ top: "0%", left: "30%", width: "45%", height: "45%", background: "radial-gradient(circle, #E4CB9C, transparent 70%)", animationDuration: "6.5s" }}
          />
          <span className="card-dot" style={{ top: "68%", left: "20%", width: 3, height: 3, animationDelay: "0.4s" }} />
        </div>
      );
  }
}
