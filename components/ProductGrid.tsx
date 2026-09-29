"use client";

import { useMemo, useState } from "react";
import { Product, getStockStatus } from "@/lib/types";
import ProductCard from "./ProductCard";
import ScrollReveal from "./ScrollReveal";

type SortKey = "newest" | "most-viewed" | "highest-rated" | "price-asc" | "price-desc";

export default function ProductGrid({
  products,
  showFilters = true,
}: {
  products: Product[];
  showFilters?: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("newest");
  const [availability, setAvailability] = useState<"all" | "in-stock" | "out-of-stock">("all");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState<number>(() =>
    Math.max(...products.map((p) => p.price), 1000)
  );
  const priceCeiling = useMemo(() => Math.max(...products.map((p) => p.price), 1000), [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (availability === "in-stock") list = list.filter((p) => getStockStatus(p.stock) !== "out-of-stock");
    if (availability === "out-of-stock") list = list.filter((p) => getStockStatus(p.stock) === "out-of-stock");
    list = list.filter((p) => p.rating >= minRating);
    list = list.filter((p) => p.price <= maxPrice);

    switch (sort) {
      case "most-viewed":
        list.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case "highest-rated":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [products, sort, availability, minRating, maxPrice]);

  return (
    <div>
      {showFilters && (
        <div className="mb-6 flex flex-wrap items-end gap-3 sm:gap-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
          <div>
            <label className="block text-[11px] font-mono tracking-widest text-bronze mb-2">AVAILABILITY</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as typeof availability)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="in-stock">In stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono tracking-widest text-bronze mb-2">MIN RATING</label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              <option value={0}>Any</option>
              <option value={4}>4★ &amp; up</option>
              <option value={4.5}>4.5★ &amp; up</option>
            </select>
          </div>

          <div className="min-w-[140px] sm:min-w-[180px]">
            <label className="block text-[11px] font-mono tracking-widest text-bronze mb-2">
              MAX PRICE — Rs. {maxPrice.toLocaleString()}
            </label>
            <input
              type="range"
              min={0}
              max={priceCeiling}
              step={10}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-gold"
            />
          </div>

          <div className="ml-auto">
            <label className="block text-[11px] font-mono tracking-widest text-bronze mb-2">SORT BY</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="most-viewed">Most Viewed</option>
              <option value="highest-rated">Highest Rated</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-20 text-center">
          <p className="font-display text-2xl">No products match these filters</p>
          <p className="mt-2 text-bronze text-sm">Try widening your price range or clearing a filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
          {filtered.map((p, i) => (
            <ScrollReveal key={p.id} delay={Math.min(i, 8) * 40}>
              <ProductCard product={p} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
