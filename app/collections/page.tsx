import Link from "next/link";
import { categories } from "@/lib/data/categories";
import ScrollReveal from "@/components/ScrollReveal";
import PageAccent from "@/components/PageAccent";

export const metadata = { title: "Collections — Kikicharms" };

export default function CollectionsPage() {
  return (
    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-10 md:py-16">
      <PageAccent tone="gold" />
      <ScrollReveal>
        <p className="text-[11px] font-mono tracking-[0.3em] text-bronze mb-2">SHOP</p>
        <h1 className="font-display text-3xl sm:text-4xl mb-8 sm:mb-10">All Collections</h1>
      </ScrollReveal>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((c, i) => (
          <ScrollReveal key={c.slug} delay={i * 50}>
            <Link
              href={`/collections/${c.slug}`}
              className="group flex items-center justify-between rounded-2xl border border-line bg-white p-6 transition-all duration-300 hover:shadow-goldglow hover:-translate-y-1"
            >
              <div>
                <h2 className="font-display text-2xl">{c.name}</h2>
                <p className="mt-1 text-sm text-bronze max-w-md">{c.description}</p>
              </div>
              <span className="text-gold text-xl transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
