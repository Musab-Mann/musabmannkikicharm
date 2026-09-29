"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import PlaceholderArt from "@/components/PlaceholderArt";
import PageAccent from "@/components/PageAccent";
import ScrollReveal from "@/components/ScrollReveal";

export default function CartPage() {
  const { items, increment, decrement, removeItem, subtotal } = useCart();
  const deliveryCharge =
    siteConfig.shipping.freeDeliveryThreshold && subtotal >= siteConfig.shipping.freeDeliveryThreshold
      ? 0
      : items.length > 0
      ? siteConfig.shipping.deliveryCharge
      : 0;
  const grandTotal = subtotal + deliveryCharge;

  if (items.length === 0) {
    return (
      <div className="relative mx-auto max-w-2xl px-5 py-16 sm:py-24 text-center">
        <PageAccent tone="gold" />
        <p className="font-display text-2xl sm:text-3xl">Your collection is waiting ✨</p>
        <p className="mt-3 text-bronze">Nothing in your cart yet — go find something you love.</p>
        <Link
          href="/collections"
          className="btn-press mt-8 inline-block rounded-full bg-gold px-7 py-3.5 text-sm font-semibold tracking-wide text-obsidian transition-transform hover:scale-[1.02]"
        >
          BROWSE COLLECTIONS
        </Link>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-10 md:py-16">
      <PageAccent tone="gold" />
      <ScrollReveal>
        <h1 className="font-display text-2xl sm:text-3xl mb-6">Your Cart</h1>
      </ScrollReveal>
      <div className="grid md:grid-cols-3 gap-6 md:gap-10">
        <div className="md:col-span-2 space-y-4">
          {items.map((item, i) => (
            <div
              key={item.productId}
              className="stagger-fade flex gap-3 sm:gap-4 rounded-2xl border border-line bg-white p-3 sm:p-4 transition-shadow duration-300 hover:shadow-goldglow"
              style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
            >
              <Link href={`/product/${item.productId}`} className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl group">
                <PlaceholderArt seed={item.productId} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/product/${item.productId}`} className="font-medium hover:text-gold transition-colors text-sm sm:text-base line-clamp-2">
                    {item.name}
                  </Link>
                  <button onClick={() => removeItem(item.productId)} className="btn-press text-xs text-bronze hover:text-red-500 transition-colors shrink-0">
                    Remove
                  </button>
                </div>
                <p className="mt-1 text-sm text-bronze">{formatPrice(item.price)}</p>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center rounded-full border border-line">
                    <button onClick={() => decrement(item.productId)} className="btn-press px-3 py-1" aria-label="Decrease quantity">
                      −
                    </button>
                    <span key={item.quantity} className="stagger-fade w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => increment(item.productId)}
                      disabled={item.quantity >= item.stock}
                      className="btn-press px-3 py-1 disabled:opacity-30"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  {item.quantity >= item.stock && (
                    <span className="text-[11px] text-amber-600">Max stock reached</span>
                  )}
                </div>
              </div>
              <p className="font-medium text-sm sm:text-base shrink-0">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 h-fit md:sticky md:top-24 transition-shadow duration-300 hover:shadow-goldglow">
          <h2 className="font-display text-xl mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-bronze">Subtotal</span>
              <span key={subtotal} className="stagger-fade">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bronze">Delivery</span>
              <span>{deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}</span>
            </div>
            <div className="border-t border-line pt-2 flex justify-between font-semibold">
              <span>Grand Total</span>
              <span key={grandTotal} className="stagger-fade">{formatPrice(grandTotal)}</span>
            </div>
          </div>
          <Link
            href="/checkout"
            className="mt-6 block rounded-full bg-gold py-3.5 text-center text-sm font-semibold tracking-wide text-obsidian transition-all hover:scale-[1.02] hover:bg-gold-dark active:scale-[0.98]"
          >
            PROCEED TO CHECKOUT
          </Link>
        </div>
      </div>
    </div>
  );
}
