"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.orders ?? []);
        setLoading(false);
      });
  }, []);

  const pending = orders.filter((o) => o.paymentStatus === "pending-verification");
  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const rejected = orders.filter((o) => o.paymentStatus === "rejected");

  function Table({ list, empty }: { list: Order[]; empty: string }) {
    if (list.length === 0) return <p className="text-sm text-bronze py-4">{empty}</p>;
    return (
      <div className="mb-8">
        {/* Mobile / tablet: cards */}
        <div className="md:hidden space-y-3">
          {list.map((o) => (
            <Link
              key={o.orderId}
              href={`/admin/orders/${o.orderId}`}
              className="block rounded-2xl border border-line bg-white p-4 active:bg-blush"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs text-bronze">{o.orderId}</span>
                <span className="text-sm font-medium">{formatPrice(o.grandTotal)}</span>
              </div>
              <p className="text-sm font-medium">{o.customer.fullName}</p>
              <p className="text-xs text-bronze mt-1">Ref: {o.paymentReference || "—"}</p>
              <p className="text-xs text-bronze">{o.paymentScreenshotUrl ? "Screenshot provided" : "No screenshot"}</p>
            </Link>
          ))}
        </div>

        {/* Desktop / laptop: table */}
        <div className="hidden md:block rounded-2xl border border-line bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-bronze">
                <th className="p-3">Order ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Reference</th>
                <th className="p-3">Screenshot</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.orderId} className="border-b border-line last:border-0">
                  <td className="p-3 font-mono text-xs">{o.orderId}</td>
                  <td className="p-3">{o.customer.fullName}</td>
                  <td className="p-3">{formatPrice(o.grandTotal)}</td>
                  <td className="p-3">{o.paymentReference || "—"}</td>
                  <td className="p-3 text-bronze text-xs">{o.paymentScreenshotUrl || "Not provided"}</td>
                  <td className="p-3">
                    <Link href={`/admin/orders/${o.orderId}`} className="text-gold-dark hover:underline">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (loading) return <p className="text-sm text-bronze">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl mb-6 sm:mb-8">Payments</h1>

      <h2 className="font-display text-lg sm:text-xl mb-3">Pending Verification</h2>
      <Table list={pending} empty="No payments waiting for verification." />

      <h2 className="font-display text-lg sm:text-xl mb-3">Paid</h2>
      <Table list={paid} empty="No paid orders yet." />

      <h2 className="font-display text-lg sm:text-xl mb-3">Rejected</h2>
      <Table list={rejected} empty="No rejected payments." />
    </div>
  );
}
