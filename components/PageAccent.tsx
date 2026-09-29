/**
 * Localized decorative corner glow for content pages (Privacy Policy,
 * Terms, About, Contact, Collections). Sits inside a `relative`
 * wrapper (not `fixed`, unlike AmbientBackground) so it scrolls with
 * the page and can sit closer to the edges of that specific page's
 * content for extra depth. Purely decorative and non-interactive.
 *
 * `tone` picks a subtly different palette so pages don't feel identical.
 */
export default function PageAccent({ tone = "gold" }: { tone?: "gold" | "rose" | "champagne" }) {
  const colors: Record<string, [string, string]> = {
    gold: ["rgba(228, 203, 156, 0.30)", "rgba(201, 168, 118, 0.16)"],
    rose: ["rgba(201, 141, 138, 0.22)", "rgba(228, 203, 156, 0.18)"],
    champagne: ["rgba(228, 203, 156, 0.26)", "rgba(201, 141, 138, 0.14)"],
  };
  const [a, b] = colors[tone];

  return (
    <div className="page-accent" aria-hidden="true">
      <div
        className="page-accent-glow"
        style={{ top: "-12%", right: "-10%", width: "38vmax", height: "38vmax", background: `radial-gradient(circle, ${a}, transparent 70%)` }}
      />
      <div
        className="page-accent-glow"
        style={{ bottom: "-14%", left: "-10%", width: "32vmax", height: "32vmax", background: `radial-gradient(circle, ${b}, transparent 70%)`, animationDelay: "-6s", animationDuration: "24s" }}
      />
    </div>
  );
}
