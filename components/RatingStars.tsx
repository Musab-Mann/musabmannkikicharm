import { Star } from "lucide-react";

export default function RatingStars({
  rating,
  reviewCount,
  size = 14,
}: {
  rating: number;
  reviewCount?: number;
  size?: number;
}) {
  if (reviewCount === 0) {
    return <span className="text-xs text-bronze">No reviews yet</span>;
  }

  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <div className="flex items-center gap-1.5" aria-label={`Rated ${safeRating.toFixed(1)} out of 5`}>
      <div className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={i <= Math.round(safeRating) ? "fill-gold text-gold" : "text-line"}
          />
        ))}
      </div>
      <span className="text-xs text-bronze">
        {safeRating.toFixed(1)}
        {typeof reviewCount === "number" && ` · ${reviewCount} reviews`}
      </span>
    </div>
  );
}
