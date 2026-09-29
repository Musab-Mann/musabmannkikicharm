"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Eye } from "lucide-react";
import { Product, getStockStatus } from "@/lib/types";
import { formatPrice, classNames } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import ProductImage from "./ProductImage";
import StockBadge from "./StockBadge";
import RatingStars from "./RatingStars";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const router = useRouter();
  const status = getStockStatus(product.stock);
  const outOfStock = status === "out-of-stock";
  const discounted = product.originalPrice && product.originalPrice > product.price;
  const wishlisted = has(product.id);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (outOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: 1,
      stock: product.stock,
    });
  }

  function handleOrderNow(e: React.MouseEvent) {
    e.preventDefault();
    if (outOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: 1,
      stock: product.stock,
    });
    router.push(`/checkout?buyNow=${product.id}`);
  }

  return (
    <Link
      href={`/product/${product.id}`}
      className="product-card-lift group block rounded-2xl border border-line bg-white overflow-hidden shadow-soft transition-shadow hover:shadow-goldglow"
    >
      <div className="relative aspect-square overflow-hidden">
        <ProductImage src={product.image} alt={product.name} seed={product.id} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <button
          onClick={(e) => {
            e.preventDefault();
            toggle(product.id);
          }}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-soft transition-transform hover:scale-110"
        >
          <Heart key={String(wishlisted)} size={16} className={classNames(wishlisted ? "fill-rose text-rose heart-pop" : "text-ink")} />
        </button>
        {discounted && (
          <span className="absolute top-3 left-3 rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-obsidian">
            SALE
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-[11px] font-mono tracking-widest text-bronze uppercase">{product.subcategory}</p>
        <h3 className="mt-1 font-display text-lg text-ink leading-tight">{product.name}</h3>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-semibold text-ink">{formatPrice(product.price)}</span>
          {discounted && (
            <span className="text-sm text-bronze line-through">{formatPrice(product.originalPrice!)}</span>
          )}
        </div>

        <div className="mt-2">
          <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <StockBadge stock={product.stock} />
          <span className="flex items-center gap-1 text-xs text-bronze">
            <Eye size={13} /> {product.viewCount.toLocaleString()}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className={classNames(
              "btn-press rounded-full border border-ink px-2 py-2 text-[10px] sm:text-xs font-semibold tracking-wide transition-colors",
              outOfStock ? "opacity-40 cursor-not-allowed" : "hover:bg-ink hover:text-ivory"
            )}
          >
            ADD TO CART
          </button>
          <button
            onClick={handleOrderNow}
            disabled={outOfStock}
            className={classNames(
              "btn-press rounded-full bg-gold px-2 py-2 text-[10px] sm:text-xs font-semibold tracking-wide text-obsidian transition-colors",
              outOfStock ? "opacity-40 cursor-not-allowed" : "hover:bg-gold-dark"
            )}
          >
            ORDER NOW
          </button>
        </div>
      </div>
    </Link>
  );
}
