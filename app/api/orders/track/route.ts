import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/store/db";
import { checkRateLimit, getClientIp } from "@/lib/admin/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(`order:track:${ip}`, 15, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  const { orderId, contact } = await req.json();

  if (!orderId || !contact) {
    return NextResponse.json({ error: "Order ID and email or phone are required." }, { status: 400 });
  }

  const order = await getOrderById(orderId.trim());
  if (!order) {
    return NextResponse.json({ error: "We couldn't find an order with that ID." }, { status: 404 });
  }

  const normalizedContact = contact.trim().toLowerCase().replace(/[\s-]/g, "");
  const matches =
    order.customer.email.toLowerCase() === normalizedContact ||
    order.customer.phone.replace(/[\s-]/g, "") === normalizedContact ||
    order.customer.whatsapp.replace(/[\s-]/g, "") === normalizedContact;

  if (!matches) {
    return NextResponse.json(
      { error: "Order ID and contact details don't match our records." },
      { status: 403 }
    );
  }

  return NextResponse.json({ order });
}
