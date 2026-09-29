"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Order, ORDER_STATUS_LABELS, OrderStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.orders ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesQuery =
        !query ||
        o.orderId.toLowerCase().includes(query.toLowerCase()) ||
        o.customer.fullName.toLowerCase().includes(query.toLowerCase()) ||
        o.customer.phone.includes(query);
      const matchesStatus = statusFilter === "all" || o.orderStatus === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [orders, query, statusFilter]);

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl mb-5 sm:mb-6">Orders</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          placeholder="Search by order ID, name, or phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-line px-4 py-2 text-sm flex-1 min-w-[220px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="rounded-lg border border-line px-4 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-bronze">Loading…</p>
      ) : (
        <>
          {/* Mobile / tablet: card list, no horizontal scrolling */}
          <div className="md:hidden space-y-3">
            {filtered.map((o) => (
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
                <p className="text-xs text-bronze mb-2">{o.customer.phone}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-blush px-2.5 py-1 text-[11px]">{ORDER_STATUS_LABELS[o.orderStatus]}</span>
                  <span className="rounded-full bg-blush px-2.5 py-1 text-[11px]">{o.paymentStatus}</span>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && <p className="text-center text-sm text-bronze py-8">No orders match.</p>}
          </div>

          {/* Desktop / laptop: full table */}
          <div className="hidden md:block rounded-2xl border border-line bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-bronze">
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.orderId} className="border-b border-line last:border-0">
                    <td className="p-3 font-mono text-xs">{o.orderId}</td>
                    <td className="p-3">{o.customer.fullName}</td>
                    <td className="p-3">{o.customer.phone}</td>
                    <td className="p-3">{formatPrice(o.grandTotal)}</td>
                    <td className="p-3">{ORDER_STATUS_LABELS[o.orderStatus]}</td>
                    <td className="p-3">{o.paymentStatus}</td>
                    <td className="p-3">
                      <Link href={`/admin/orders/${o.orderId}`} className="text-gold-dark hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-bronze">No orders match.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
