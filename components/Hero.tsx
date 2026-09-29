import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-obsidian text-ivory min-h-[520px] sm:min-h-[600px] md:min-h-[680px] lg:min-h-[760px] flex items-center">
      {/* Hero background photo — the ONLY visual element in this hero.
          object-cover guarantees the image is always cropped to fill its
          box, never stretched or squashed. The image's own empty, unbusy
          area sits dead-center (the product box and logo are on the left
          edge, the ribbon/branch are on the right edge), so a centered
          object-position keeps that safe zone in frame at every viewport
          width — narrow screens simply lose more of the left/right edges
          rather than cropping into the box or the branch awkwardly. */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src="/images/kkcharm-hero-background.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Uniform dark tint so gold/ivory text always has contrast,
            regardless of how light or dark the underlying photo region is. */}
        <div className="absolute inset-0 bg-obsidian/45" />
        {/* Extra vignette focused on the middle, where the text sits. */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 65% 55% at center, rgba(11,10,13,0.55), transparent 70%)" }}
        />
        {/* Soft edge fades so the hero blends into the header above and the
            page content below instead of ending on a hard line. */}
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian/55 via-transparent to-obsidian/60" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-5 py-16 md:py-24 text-center">
        <p className="hero-fade hero-delay-1 text-[11px] font-mono tracking-[0.3em] text-gold mb-5">HANDMADE · CHARM BY CHARM</p>
        <h1 className="hero-fade hero-delay-2 font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-balance">
          Craft your
          <br />
          <span className="italic text-gold">own beauty</span>
        </h1>
        <p className="hero-fade hero-delay-3 mt-5 text-ivory/70 text-[15px] leading-relaxed max-w-md mx-auto">
          Charms, beads, keychains and craft kits — hand-finished in small batches for
          people who like to build their own story, one piece at a time.
        </p>
        <div className="hero-fade hero-delay-4 mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/collections" className="rounded-full bg-gold px-6 py-3 text-sm font-semibold tracking-wide text-obsidian transition-all duration-300 hover:-translate-y-0.5 hover:shadow-goldglow">
            SHOP COLLECTIONS
          </Link>
          <Link href="/about" className="rounded-full border border-ivory/30 px-6 py-3 text-sm font-semibold tracking-wide text-ivory transition-all duration-300 hover:-translate-y-0.5 hover:border-gold hover:text-gold">
            OUR STORY
          </Link>
        </div>
      </div>
    </section>
  );
}
