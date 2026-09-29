"use client";

import { useEffect, useState } from "react";
import { Review } from "@/lib/types";
import RatingStars from "./RatingStars";

export default function ReviewSection({
  productId,
  rating,
  reviewCount,
}: {
  productId: string;
  rating: number;
  reviewCount: number;
}) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [selectedRating, setSelectedRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadReviews() {
    try {
      const response = await fetch(`/api/products/${productId}/reviews`);
      const data = await response.json();
      setReviews(data.reviews ?? []);
    } catch {
      setReviews([]);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const count =
      reviews?.filter((r) => Math.round(r.rating) === star).length ?? 0;

    const pct =
      reviews && reviews.length > 0
        ? Math.round((count / reviews.length) * 100)
        : 0;

    return { star, count, pct };
  });

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();

    if (!customerName.trim() || !reviewText.trim()) {
      setMessage("Please enter your name and review.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          rating: selectedRating,
          text: reviewText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to submit review.");
        return;
      }

      setReviews((current) =>
        current ? [data.review, ...current] : [data.review]
      );

      setCustomerName("");
      setReviewText("");
      setSelectedRating(5);
      setMessage("Review submitted successfully! ⭐");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-10">
        <div className="md:w-64 shrink-0">
          {(() => {
            const actualReviewCount = reviews?.length ?? 0;
            const actualRating =
              actualReviewCount > 0
                ? reviews!.reduce((sum, review) => sum + review.rating, 0) / actualReviewCount
                : 0;

            return (
              <>
                <p className="font-display text-5xl">{actualReviewCount > 0 ? actualRating.toFixed(1) : "—"}</p>
                <RatingStars rating={actualRating} reviewCount={actualReviewCount} size={16} />
                <p className="mt-1 text-sm text-bronze">
                  {actualReviewCount > 0 ? `${actualReviewCount} reviews` : "No reviews yet"}
                </p>
              </>
            );
          })()}

          <div className="mt-5 space-y-2">
            {breakdown.map((b) => (
              <div
                key={b.star}
                className="flex items-center gap-2 text-xs"
              >
                <span className="w-10 text-bronze">
                  {b.star}★
                </span>

                <div className="h-1.5 flex-1 rounded-full bg-blush overflow-hidden">
                  <div
                    className="h-full bg-gold"
                    style={{ width: `${b.pct}%` }}
                  />
                </div>

                <span className="w-6 text-bronze text-right">
                  {b.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-6">
          {reviews === null && (
            <p className="text-sm text-bronze">
              Loading reviews…
            </p>
          )}

          {reviews?.length === 0 && (
            <p className="text-sm text-bronze">
              No reviews yet — be the first to share your experience.
            </p>
          )}

          {reviews?.map((r) => (
            <div
              key={r.id}
              className="border-b border-line pb-5"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{r.customerName}</p>

                <span className="text-xs text-bronze">
                  {new Date(r.date).toLocaleDateString()}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <RatingStars rating={r.rating} />

                {r.verifiedPurchase && (
                  <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] text-green-700">
                    Verified Purchase
                  </span>
                )}

                {r.isDemoData && (
                  <span className="rounded-full bg-blush border border-line px-2 py-0.5 text-[10px] text-bronze">
                    Sample Review
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-ink/80">
                {r.text}
              </p>
            </div>
          ))}

          <form
            onSubmit={handleSubmitReview}
            className="mt-8 border-t border-line pt-6"
          >
            <h3 className="font-display text-2xl">
              Leave a Review
            </h3>

            <div className="mt-4">
              <label className="block text-sm font-medium">
                Your rating
              </label>

              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    className={`text-2xl transition-opacity ${
                      selectedRating >= star
                        ? "opacity-100"
                        : "opacity-30"
                    }`}
                    aria-label={`${star} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium">
                Your name
              </label>

              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your name"
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-gold"
                maxLength={100}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium">
                Your review
              </label>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-gold"
                maxLength={1000}
              />
            </div>

            {message && (
              <p className="mt-3 text-sm text-bronze">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-obsidian transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "SUBMITTING..." : "SUBMIT REVIEW"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}