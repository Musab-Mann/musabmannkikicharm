
import { notFound } from "next/navigation";
import { getLiveProductById, incrementViewCount, getLiveProducts } from "@/lib/store/db";
import ProductDetailClient from "./ProductDetailClient";
import ProductCard from "@/components/ProductCard";
import ScrollReveal from "@/components/ScrollReveal";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await getLiveProductById(id);
  if (!product) notFound();

  await incrementViewCount(id);
  const fresh = (await getLiveProductById(id))!;

  const all = await getLiveProducts();
  const related = all
    .filter((p) => p.category === fresh.category && p.id !== fresh.id)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <ProductDetailClient product={fresh} />

      {related.length > 0 && (
        <section className="mt-14 sm:mt-20">
          <ScrollReveal>
            <p className="text-[11px] font-mono tracking-[0.3em] text-bronze mb-2">
              YOU MAY ALSO LIKE
            </p>
            <h2 className="font-display text-2xl sm:text-3xl mb-6 sm:mb-8">
              Related Products
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
            {related.map((p, i) => (
              <ScrollReveal
                key={p.id}
                variant="scale"
                delay={Math.min(i, 8) * 60}
              >
                <ProductCard product={p} />
              </ScrollReveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

