"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import ScrollReveal from "@/components/ScrollReveal";

export default function WishlistPage() {
  const { ids } = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(data.products.filter((p: Product) => ids.includes(p.id))));
  }, [ids]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 md:py-16">
      <ScrollReveal>
        <h1 className="font-display text-3xl sm:text-4xl mb-10">Your Wishlist</h1>
      </ScrollReveal>

      {products === null ? (
        <p className="text-bronze text-sm">Loading…</p>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-20 text-center">
          <p className="font-display text-2xl">Nothing saved yet</p>
          <p className="mt-2 text-bronze text-sm">Tap the heart on any product to save it here.</p>
          <Link href="/collections" className="mt-6 inline-block rounded-full bg-gold px-6 py-3 text-sm font-semibold text-obsidian">
            BROWSE COLLECTIONS
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {products.map((p, i) => (
            <ScrollReveal key={p.id} variant="scale" delay={(i % 4) * 60}>
              <ProductCard product={p} />
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
