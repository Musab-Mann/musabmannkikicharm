import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderById } from "@/lib/store/db";
import { formatPrice } from "@/lib/utils";
import { siteConfig, buildOrderWhatsAppLink } from "@/lib/config";
import { getBusinessSettings } from "@/lib/admin/business-settings";
import { ORDER_STATUS_LABELS } from "@/lib/types";
import ScrollReveal from "@/components/ScrollReveal";

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
params,
}: {
params: Promise<{ orderId: string }>;
}) {
const { orderId } = await params;

const [order, businessSettings] = await Promise.all([
getOrderById(orderId),
getBusinessSettings(),
]);

if (!order) notFound();

return ( <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 md:py-16 text-center"> <ScrollReveal variant="scale"> <p className="text-4xl">✨</p> <h1 className="font-display text-3xl sm:text-4xl mt-3">
Order Confirmed </h1> <p className="mt-2 text-bronze">
Thank you, {order.customer.fullName} — we’ve received your
order. </p> <p className="mt-4 font-mono text-lg tracking-wide">
{order.orderId} </p> </ScrollReveal>

```
  <div className="mt-8 rounded-2xl border border-line bg-white p-6 text-left">
    <div className="space-y-1.5 text-sm">
      {order.items.map((i) => (
        <div key={i.productId} className="flex justify-between">
          <span>
            {i.name} × {i.quantity}
          </span>
          <span>{formatPrice(i.subtotal)}</span>
        </div>
      ))}
    </div>

    <div className="border-t border-line mt-3 pt-3 space-y-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-bronze">Subtotal</span>
        <span>{formatPrice(order.subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-bronze">Delivery</span>
        <span>{formatPrice(order.deliveryCharge)}</span>
      </div>
      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span>{formatPrice(order.grandTotal)}</span>
      </div>
    </div>

    <div className="border-t border-line mt-3 pt-3 text-sm space-y-1">
      <p>
        <span className="text-bronze">Payment method:</span>{" "}
        {order.paymentMethod.toUpperCase()}
      </p>
      <p>
        <span className="text-bronze">Payment status:</span>{" "}
        {order.paymentStatus}
      </p>
      <p>
        <span className="text-bronze">Order status:</span>{" "}
        {ORDER_STATUS_LABELS[order.orderStatus]}
      </p>
      <p>
        <span className="text-bronze">Delivering to:</span>{" "}
        {order.delivery.address}, {order.delivery.area},{" "}
        {order.delivery.city}
      </p>
      <p>
        <span className="text-bronze">Estimated delivery:</span>{" "}
        {siteConfig.shipping.deliveryTimeLabel}
      </p>
    </div>
  </div>

  <div className="mt-8 flex flex-wrap justify-center gap-3">
    <Link
      href={`/track-order?orderId=${order.orderId}`}
      className="rounded-full border border-ink px-6 py-3 text-sm font-semibold"
    >
      TRACK ORDER
    </Link>

    <Link
      href="/collections"
      className="rounded-full border border-ink px-6 py-3 text-sm font-semibold"
    >
      CONTINUE SHOPPING
    </Link>

    <a
      href={buildOrderWhatsAppLink(
        order.items[0]?.name ?? "my order",
        order.orderId,
        businessSettings.whatsapp
      )}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-obsidian"
    >
      CHAT ON WHATSAPP
    </a>
  </div>
</div>

);
}
