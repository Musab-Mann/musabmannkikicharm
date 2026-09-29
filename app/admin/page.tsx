"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Order, Product, getStockStatus, ORDER_STATUS_LABELS } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]).then(([o, p]) => {
      setOrders(o.orders ?? []);
      setProducts(p.products ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-sm text-bronze">Loading dashboard…</p>;

  const counts = {
    total: orders.length,
    new: orders.filter((o) => o.orderStatus === "order-placed").length,
    processing: orders.filter((o) => o.orderStatus === "processing").length,
    shipped: orders.filter((o) => o.orderStatus === "shipped").length,
    delivered: orders.filter((o) => o.orderStatus === "delivered").length,
    cancelled: orders.filter((o) => o.orderStatus === "cancelled").length,
  };
  const revenue = orders
    .filter((o) => o.orderStatus !== "cancelled")
    .reduce((sum, o) => sum + o.grandTotal, 0);
  const lowStock = products.filter((p) => getStockStatus(p.stock) === "low-stock").length;
  const outOfStock = products.filter((p) => getStockStatus(p.stock) === "out-of-stock").length;

  const cards = [
    { label: "Total Orders", value: counts.total },
    { label: "New Orders", value: counts.new },
    { label: "Processing", value: counts.processing },
    { label: "Shipped", value: counts.shipped },
    { label: "Delivered", value: counts.delivered },
    { label: "Cancelled", value: counts.cancelled },
    { label: "Revenue", value: formatPrice(revenue) },
    { label: "Products", value: products.length },
    { label: "Low Stock", value: lowStock },
    { label: "Out of Stock", value: outOfStock },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl mb-6 sm:mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-2xl font-display">{c.value}</p>
            <p className="text-xs text-bronze mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display text-lg sm:text-xl mb-4">Recent Orders</h2>

      {/* Mobile / tablet: card list */}
      <div className="md:hidden space-y-3">
        {orders.slice(0, 10).map((o) => (
          <Link key={o.orderId} href={`/admin/orders/${o.orderId}`} className="block rounded-2xl border border-line bg-white p-4 active:bg-blush">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-xs text-bronze">{o.orderId}</span>
              <span className="text-sm font-medium">{formatPrice(o.grandTotal)}</span>
            </div>
            <p className="text-sm font-medium">{o.customer.fullName}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="rounded-full bg-blush px-2.5 py-1 text-[11px]">{ORDER_STATUS_LABELS[o.orderStatus]}</span>
              <span className="rounded-full bg-blush px-2.5 py-1 text-[11px]">{o.paymentStatus}</span>
            </div>
          </Link>
        ))}
        {orders.length === 0 && <p className="text-center text-sm text-bronze py-8">No orders yet.</p>}
      </div>

      {/* Desktop / laptop: table */}
      <div className="hidden md:block rounded-2xl border border-line bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-bronze">
              <th className="p-3">Order ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 10).map((o) => (
              <tr key={o.orderId} className="border-b border-line last:border-0">
                <td className="p-3 font-mono text-xs">{o.orderId}</td>
                <td className="p-3">{o.customer.fullName}</td>
                <td className="p-3">{formatPrice(o.grandTotal)}</td>
                <td className="p-3">{ORDER_STATUS_LABELS[o.orderStatus]}</td>
                <td className="p-3">{o.paymentStatus}</td>
                <td className="p-3">
                  <Link href={`/admin/orders/${o.orderId}`} className="text-gold-dark hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-bronze">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
