import Link from "next/link";
import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import ScrollReveal from "@/components/ScrollReveal";
import CollectionCardArt from "@/components/CollectionCardArt";
import { getLiveProducts, getAllReviews } from "@/lib/store/db";
import { categories } from "@/lib/data/categories";
import { buildWhatsAppLink } from "@/lib/config";
import { getBusinessSettings } from "@/lib/admin/business-settings";

export const dynamic = "force-dynamic";

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12 md:py-16">
      <ScrollReveal>
        <p className="text-[11px] font-mono tracking-[0.3em] text-bronze mb-2">{eyebrow}</p>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl mb-6 md:mb-8">{title}</h2>
      </ScrollReveal>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [products, reviews, businessSettings] = await Promise.all([
    getLiveProducts(),
    getAllReviews(),
    getBusinessSettings(),
  ]);
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const bestsellers = products.filter((p) => p.bestseller).slice(0, 4);
  const newArrivals = products.filter((p) => p.newArrival).slice(0, 4);
  const trending = products.filter((p) => p.trending).slice(0, 4);

  return (
    <>
      <Hero />

      <Section eyebrow="EXPLORE" title="Featured Collections">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {categories.slice(0, 6).map((c, i) => (
            <ScrollReveal key={c.slug} delay={i * 80}>
              <Link
                href={`/collections/${c.slug}`}
                className="collection-card group relative block aspect-[4/3] overflow-hidden rounded-xl sm:rounded-2xl bg-blush border border-line"
              >
                <CollectionCardArt index={i} />
                <div className="collection-shine absolute inset-0 pointer-events-none" />
                <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-5 bg-gradient-to-t from-obsidian/70 via-transparent to-transparent transition-all duration-500 group-hover:from-obsidian/80">
                  <p className="text-ivory font-display text-base sm:text-xl leading-tight">{c.name.replace(" Collection", "")}</p>
                  <p className="text-ivory/70 text-[11px] sm:text-xs mt-1 line-clamp-1 opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">{c.description}</p>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {bestsellers.length > 0 && (
        <Section eyebrow="LOVED BY CUSTOMERS" title="Best Sellers">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Section>
      )}

      {newArrivals.length > 0 && (
        <Section eyebrow="JUST IN" title="New Arrivals">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Section>
      )}

      {trending.length > 0 && (
        <Section eyebrow="RIGHT NOW" title="Trending">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Section>
      )}

      {featured.length > 0 && (
        <Section eyebrow="THE EDIT" title="Featured Charms &amp; Beads">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Section>
      )}

      {reviews.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12 md:py-16">
          <ScrollReveal>
            <p className="text-[11px] font-mono tracking-[0.3em] text-bronze mb-2">WHAT CUSTOMERS SAY</p>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl mb-6 md:mb-8">Customer Reviews</h2>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {reviews.slice(0, 3).map((r, i) => (
              <ScrollReveal key={r.id} delay={i * 80}>
                <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 h-full">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{r.customerName}</p>
                    <span className="text-xs text-bronze">{r.rating}/5</span>
                  </div>
                  <p className="mt-3 text-sm text-ink/80">&ldquo;{r.text}&rdquo;</p>
                  <p className="mt-3 text-xs text-bronze">{new Date(r.date).toLocaleDateString()}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>
      )}

      <section className="bg-obsidian text-ivory">
        <div className="mx-auto max-w-4xl px-5 py-16 md:py-20 text-center">
          <ScrollReveal>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl">Have something in mind?</h2>
            <p className="mt-3 text-ivory/70 text-sm sm:text-base">
              Message us on WhatsApp and we&rsquo;ll help you put a custom piece together.
            </p>
            <a
              href={buildWhatsAppLink(undefined, businessSettings.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-block rounded-full bg-gold px-7 py-3.5 text-sm font-semibold tracking-wide text-obsidian transition-transform hover:scale-[1.03]"
            >
              CHAT ON WHATSAPP
            </a>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
