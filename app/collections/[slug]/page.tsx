import { notFound } from "next/navigation";
import { getCategoryBySlug, categories } from "@/lib/data/categories";
import { getLiveProducts } from "@/lib/store/db";
import ProductGrid from "@/components/ProductGrid";
import ScrollReveal from "@/components/ScrollReveal";
import PageAccent from "@/components/PageAccent";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
return categories.map((c) => ({ slug: c.slug }));
}

export default async function CategoryPage({
params,
searchParams,
}: {
params: Promise<{ slug: string }>;
searchParams: Promise<{ sub?: string }>;
}) {
const { slug } = await params;
const { sub } = await searchParams;

const category = getCategoryBySlug(slug);
if (!category) notFound();

const all = await getLiveProducts();
let products = all.filter((p) => p.category === category.slug);

if (sub) {
products = products.filter((p) => p.subcategory === sub);
}

return ( <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-10 md:py-16"> <PageAccent tone="champagne" /> <ScrollReveal> <p className="text-[11px] font-mono tracking-[0.3em] text-bronze mb-2">
COLLECTION </p> <h1 className="font-display text-3xl sm:text-4xl mb-2">
{category.name} </h1> <p className="text-bronze max-w-xl mb-8 sm:mb-10">
{category.description} </p> </ScrollReveal>

  {products.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-line py-20 text-center">
      <p className="font-display text-2xl">More pieces are on the way ✨</p>
      <p className="mt-2 text-bronze text-sm">
        This collection doesn&rsquo;t have items published yet — check back soon.
      </p>
    </div>
  ) : (
    <ProductGrid products={products} />
  )}
</div>

);
}
