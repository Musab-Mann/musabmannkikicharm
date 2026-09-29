"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Product } from "@/lib/types";
import ProductGrid from "@/components/ProductGrid";
import ScrollReveal from "@/components/ScrollReveal";
import { categories } from "@/lib/data/categories";

function SearchInner() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        setAllProducts(data.products);
        setLoading(false);
      });
  }, []);

  const needle = q.toLowerCase();
  const matchingCategories = categories.filter(
    (c) => c.name.toLowerCase().includes(needle) || c.slug.includes(needle)
  );
  const results = q
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.subcategory.toLowerCase().includes(needle) ||
          p.category.toLowerCase().includes(needle) ||
          p.description.toLowerCase().includes(needle)
      )
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 md:py-16">
      <ScrollReveal>
        <h1 className="font-display text-3xl mb-2">Search Results</h1>
        {q ? (
          <p className="text-bronze mb-10">
            {results.length} result{results.length !== 1 && "s"} for &ldquo;{q}&rdquo;
          </p>
        ) : (
          <p className="text-bronze mb-10">Start typing in the search bar to find products and collections.</p>
        )}
      </ScrollReveal>

      {matchingCategories.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-2">
          {matchingCategories.map((c) => (
            <a
              key={c.slug}
              href={`/collections/${c.slug}`}
              className="rounded-full border border-line bg-white px-4 py-2 text-xs font-medium hover:border-gold"
            >
              {c.name}
            </a>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-bronze">Searching…</p>
      ) : q && results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-20 text-center">
          <p className="font-display text-2xl">No products found</p>
          <p className="mt-2 text-bronze text-sm">Try a different word, or browse collections instead.</p>
        </div>
      ) : (
        results.length > 0 && <ProductGrid products={results} />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
