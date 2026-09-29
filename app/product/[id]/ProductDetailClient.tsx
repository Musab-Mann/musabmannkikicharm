"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, X } from "lucide-react";
import Image from "next/image";
import { Product, getStockStatus } from "@/lib/types";
import { formatPrice, classNames } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { buildOrderWhatsAppLink, siteConfig } from "@/lib/config";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import PlaceholderArt from "@/components/PlaceholderArt";
import StockBadge from "@/components/StockBadge";
import RatingStars from "@/components/RatingStars";
import ReviewSection from "@/components/ReviewSection";

const TABS = ["Description", "Details", "Reviews", "Shipping"] as const;

export default function ProductDetailClient({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Description");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const router = useRouter();
  const { settings: businessSettings } = useBusinessSettings();

  const status = getStockStatus(product.stock);
  const outOfStock = status === "out-of-stock";
  const discounted = product.originalPrice && product.originalPrice > product.price;
  const images = [product.image, ...(product.additionalImages ?? [])].filter((url, index, all) => Boolean(url) && all.indexOf(url) === index);
  const wishlisted = has(product.id);

  function handleAddToCart() {
    if (outOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: qty,
      stock: product.stock,
    });
  }

  function handleOrderNow() {
    if (outOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: qty,
      stock: product.stock,
    });
    router.push(`/checkout?buyNow=${product.id}`);
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 md:gap-12">
      {/* Image gallery */}
      <div>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group relative block w-full aspect-square rounded-2xl overflow-hidden border border-line bg-ivory"
          aria-label="Open product image"
        >
          {images[activeImage] ? (
            <Image
              key={activeImage}
              src={images[activeImage]}
              alt={`${product.name} image ${activeImage + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="gallery-crossfade object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <PlaceholderArt seed={`${product.id}-${activeImage}`} className="h-full w-full object-cover" />
          )}
        </button>
        {images.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((image, i) => (
              <button
                key={`${image}-${i}`}
                onClick={() => setActiveImage(i)}
                aria-label={`View image ${i + 1}`}
                className={classNames(
                  "relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-xl border bg-ivory shrink-0 transition-all duration-200 hover:scale-105",
                  activeImage === i ? "border-gold ring-1 ring-gold" : "border-line"
                )}
              >
                <Image src={image} alt={`${product.name} thumbnail ${i + 1}`} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
        {images.length > 1 && <p className="mt-2 text-[11px] text-bronze">Tap the main image to view it larger.</p>}

        {lightboxOpen && images[activeImage] && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-3" onClick={() => setLightboxOpen(false)}>
            <button type="button" onClick={() => setLightboxOpen(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Close image viewer"><X size={22} /></button>
            <div className="relative h-[85vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              <Image src={images[activeImage]} alt={product.name} fill sizes="90vw" className="object-contain" />
            </div>
          </div>
        )}
      </div>

      {/* Product info */}
      <div>
        <p className="text-[11px] font-mono tracking-widest text-bronze uppercase">{product.subcategory}</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl leading-tight">{product.name}</h1>

        <div className="mt-3">
          <RatingStars rating={product.rating} reviewCount={product.reviewCount} size={16} />
        </div>

        <div className="mt-4 flex items-baseline gap-3 flex-wrap">
          <span className="font-display text-2xl sm:text-3xl">{formatPrice(product.price)}</span>
          {discounted && <span className="text-lg text-bronze line-through">{formatPrice(product.originalPrice!)}</span>}
        </div>

        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <StockBadge stock={product.stock} />
          <span className="text-xs text-bronze">{product.viewCount.toLocaleString()} views</span>
        </div>

        <p className="mt-5 text-sm text-ink/75 leading-relaxed">{product.description}</p>

        {/* Quantity + wishlist */}
        <div className="mt-7 flex items-center gap-3 flex-wrap">
          <div className="flex items-center rounded-full border border-line">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="btn-press px-4 py-2 text-lg"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span key={qty} className="stagger-fade w-8 text-center">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              className="btn-press px-4 py-2 text-lg"
              aria-label="Increase quantity"
              disabled={qty >= product.stock}
            >
              +
            </button>
          </div>
          <button
            onClick={() => toggle(product.id)}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className="btn-press flex h-11 w-11 items-center justify-center rounded-full border border-line shrink-0 transition-colors hover:border-gold"
          >
            <Heart key={String(wishlisted)} size={18} className={classNames(wishlisted ? "fill-rose text-rose heart-pop" : "")} />
          </button>
        </div>

        {/* CTA buttons — full width on mobile */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className={classNames(
              "btn-press rounded-full border border-ink px-3 py-3 text-sm font-semibold tracking-wide transition-colors",
              outOfStock ? "opacity-40 cursor-not-allowed" : "hover:bg-ink hover:text-ivory"
            )}
          >
            ADD TO CART
          </button>
          <button
            onClick={handleOrderNow}
            disabled={outOfStock}
            className={classNames(
              "btn-press rounded-full bg-gold px-3 py-3 text-sm font-semibold tracking-wide text-obsidian transition-colors",
              outOfStock ? "opacity-40 cursor-not-allowed" : "hover:bg-gold-dark"
            )}
          >
            ORDER NOW
          </button>
        </div>

        <a
          href={buildOrderWhatsAppLink(product.name, undefined, businessSettings.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs text-bronze underline"
        >
          Ask about this piece on WhatsApp
        </a>

        {/* Tabs */}
        <div className="mt-8 border-t border-line pt-6">
          <div className="flex gap-4 border-b border-line text-sm overflow-x-auto scrollbar-none">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={classNames(
                  "pb-3 -mb-px border-b-2 font-medium whitespace-nowrap transition-colors duration-300",
                  tab === t ? "border-gold text-ink" : "border-transparent text-bronze hover:text-ink"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="pt-5 text-sm text-ink/80 leading-relaxed">
            {tab === "Description" && <p>{product.description}</p>}
            {tab === "Details" && (
              <ul className="space-y-1.5">
                <li>Category: {product.category}</li>
                <li>Subcategory: {product.subcategory}</li>
                <li>Stock: {product.stock} units</li>
                <li>SKU: {product.id}</li>
              </ul>
            )}
            {tab === "Reviews" && (
              <ReviewSection productId={product.id} rating={product.rating} reviewCount={product.reviewCount} />
            )}
            {tab === "Shipping" && (
              <div>
                <p>Estimated delivery: {siteConfig.shipping.deliveryTimeLabel}</p>
                <p className="mt-1">
                  Delivery charge: {formatPrice(businessSettings.deliveryCharge)}
                  {businessSettings.freeDeliveryThreshold &&
                    ` (free above ${formatPrice(businessSettings.freeDeliveryThreshold)})`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
