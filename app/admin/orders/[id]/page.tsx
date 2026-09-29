"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Order, ORDER_STATUS_LABELS, OrderStatus, PaymentStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

const ALL_STATUSES: OrderStatus[] = [
  "order-placed",
  "order-confirmed",
  "processing",
  "shipped",
  "out-for-delivery",
  "delivered",
  "cancelled",
];

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/orders/${params.id}`)
      .then((r) => r.json())
      .then((data) => setOrder(data.order ?? null));
  }

  useEffect(load, [params.id]);

  async function updateStatus(orderStatus: OrderStatus) {
    setSaving(true);
    await fetch(`/api/orders/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderStatus }),
    });
    setSaving(false);
    load();
  }

  async function updatePayment(paymentStatus: PaymentStatus) {
    setSaving(true);
    await fetch(`/api/orders/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus }),
    });
    setSaving(false);
    load();
  }

  if (!order) return <p className="text-sm text-bronze">Loading…</p>;

  return (
    <div>
      <p className="font-mono text-sm text-bronze mb-1">{order.orderId}</p>
      <h1 className="font-display text-3xl mb-8">Order Detail</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
            <h2 className="text-[11px] font-mono tracking-widest text-bronze mb-3">CUSTOMER</h2>
            <p className="text-sm break-words">{order.customer.fullName}</p>
            <p className="text-sm text-bronze break-words">{order.customer.email}</p>
            <p className="text-sm text-bronze break-words">WhatsApp: {order.customer.whatsapp}</p>
            <p className="text-sm text-bronze break-words">Phone: {order.customer.phone}</p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
            <h2 className="text-[11px] font-mono tracking-widest text-bronze mb-3">DELIVERY ADDRESS</h2>
            <p className="text-sm break-words">{order.delivery.address}, {order.delivery.area}</p>
            <p className="text-sm break-words">{order.delivery.city} {order.delivery.postalCode}</p>
            {order.delivery.instructions && <p className="text-sm text-bronze mt-1 break-words">Note: {order.delivery.instructions}</p>}
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
            <h2 className="text-[11px] font-mono tracking-widest text-bronze mb-3">ITEMS</h2>
            <div className="space-y-2 text-sm">
              {order.items.map((i) => (
                <div key={i.productId} className="flex justify-between gap-3">
                  <span className="break-words">{i.name} × {i.quantity}</span>
                  <span className="shrink-0">{formatPrice(i.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-line mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-bronze">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-bronze">Delivery</span><span>{formatPrice(order.deliveryCharge)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatPrice(order.grandTotal)}</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
            <h2 className="text-[11px] font-mono tracking-widest text-bronze mb-3">PAYMENT</h2>
            <p className="text-sm">Method: {order.paymentMethod.toUpperCase()}</p>
            <p className="text-sm">Status: {order.paymentStatus}</p>
            {order.paymentReference && <p className="text-sm break-words">Reference: {order.paymentReference}</p>}
            {order.paymentScreenshotUrl && (
              <p className="text-sm text-bronze">
                Screenshot:{" "}
                <a
                  href={order.paymentScreenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-dark underline break-all"
                >
                  View
                </a>
              </p>
            )}
            {order.paymentMethod !== "cod" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={saving}
                  onClick={() => updatePayment("paid")}
                  className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Mark Paid
                </button>
                <button
                  disabled={saving}
                  onClick={() => updatePayment("rejected")}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 sm:p-5 h-fit">
          <h2 className="text-[11px] font-mono tracking-widest text-bronze mb-3">ORDER STATUS</h2>
          <select
            value={order.orderStatus}
            disabled={saving}
            onChange={(e) => updateStatus(e.target.value as OrderStatus)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-bronze">Updating status emails the customer automatically.</p>

          <div className="mt-5">
            <h3 className="text-[11px] font-mono tracking-widest text-bronze mb-2">HISTORY</h3>
            <ul className="space-y-1 text-xs text-bronze">
              {order.statusHistory.map((h, i) => (
                <li key={i} className="break-words">{ORDER_STATUS_LABELS[h.status]} — {new Date(h.at).toLocaleString()}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
