"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Order, ORDER_STATUS_SEQUENCE, ORDER_STATUS_LABELS } from "@/lib/types";
import { formatPrice, classNames } from "@/lib/utils";
import { Check } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

function TrackOrderInner() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("orderId") ?? "");
  const [contact, setContact] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrder(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, contact }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Order not found.");
      } else {
        setOrder(data.order);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const currentIndex = order ? ORDER_STATUS_SEQUENCE.indexOf(order.orderStatus) : -1;
  const cancelled = order?.orderStatus === "cancelled";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 md:py-16">
      <ScrollReveal>
        <h1 className="font-display text-3xl mb-2">Track Your Order</h1>
        <p className="text-bronze text-sm mb-8">
          Enter your Order ID along with the email or phone number used at checkout.
        </p>
      </ScrollReveal>

      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Order ID (e.g. ORD-2026-000123)"
          className="input"
          required
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Email or phone used at checkout"
          className="input"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-2 rounded-full bg-gold py-3 text-sm font-semibold tracking-wide text-obsidian disabled:opacity-50"
        >
          {loading ? "SEARCHING…" : "TRACK ORDER"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {order && (
        <div className="mt-10 rounded-2xl border border-line bg-white p-6">
          <p className="font-mono text-sm text-bronze">{order.orderId}</p>
          <p className="mt-1 text-sm">
            {order.items.map((i) => i.name).join(", ")} — {formatPrice(order.grandTotal)}
          </p>

          {cancelled ? (
            <p className="mt-6 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
              This order was cancelled.
            </p>
          ) : (
            <ol className="mt-8 space-y-6">
              {ORDER_STATUS_SEQUENCE.map((status, i) => {
                const done = i <= currentIndex;
                return (
                  <li key={status} className="flex items-center gap-4">
                    <span
                      className={classNames(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs",
                        done ? "bg-gold border-gold text-obsidian" : "border-line text-bronze"
                      )}
                    >
                      {done ? <Check size={14} /> : i + 1}
                    </span>
                    <span className={done ? "font-medium" : "text-bronze"}>{ORDER_STATUS_LABELS[status]}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      <style jsx global>{`
        .input {
          border: 1px solid #e4d9ce;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: 2px solid #c9a876;
        }
      `}</style>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense>
      <TrackOrderInner />
    </Suspense>
  );
}
