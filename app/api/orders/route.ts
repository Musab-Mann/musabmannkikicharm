import { NextRequest, NextResponse } from "next/server";
import { createOrder, getAllOrders, getLiveProductById, reserveStockForOrder } from "@/lib/store/db";
import { generateOrderId, isValidEmail, isValidPKPhone } from "@/lib/utils";
import { Order, OrderItem } from "@/lib/types";
import { isAdminRequestAuthed } from "@/lib/auth";
import { sendAdminNewOrderEmail, sendCustomerConfirmationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/admin/rate-limit";
import { getBusinessSettings } from "@/lib/admin/business-settings";

interface IncomingItem {
  productId: string;
  quantity: number;
}

export async function GET(req: NextRequest) {
  // Admin-only: list all orders.
  if (!(await isAdminRequestAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Pagination: an unbounded "select *" here would get slower and more
  // expensive as order volume grows — cap + offset keeps every request
  // cheap regardless of how many orders exist (see PRODUCTION_DEPLOYMENT.md,
  // High Availability & Scalability section).
  const { searchParams } = new URL(req.url);
  const limit = Math.min(1000, Math.max(1, Number(searchParams.get("limit")) || 500));
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const { orders, total } = await getAllOrders({ limit, offset });
  return NextResponse.json({ orders, total, limit, offset });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(`order:create:${ip}`, 8, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many orders submitted. Please wait a few minutes and try again." }, { status: 429 });
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 200_000) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  const body = await req.json();

  const { customer, delivery, items, paymentMethod, paymentReference, paymentScreenshotUrl } = body as {
    customer: { fullName: string; email: string; whatsapp: string; phone: string };
    delivery: { address: string; area: string; city: string; postalCode: string; instructions?: string };
    items: IncomingItem[];
    paymentMethod: "cod" | "easypaisa" | "bank";
    paymentReference?: string;
    paymentScreenshotUrl?: string;
  };

  // ---- SERVER-SIDE VALIDATION (never trust the client alone) ----
  const errors: Record<string, string> = {};
  if (!customer?.fullName?.trim()) errors.fullName = "Full name is required.";
  if (!customer?.email || !isValidEmail(customer.email)) errors.email = "A valid email is required.";
  if (!customer?.whatsapp || !isValidPKPhone(customer.whatsapp)) errors.whatsapp = "A valid WhatsApp number is required.";
  if (!customer?.phone || !isValidPKPhone(customer.phone)) errors.phone = "A valid phone number is required.";
  if (!delivery?.address?.trim()) errors.address = "Address is required.";
  if (!delivery?.city?.trim()) errors.city = "City is required.";
  if (!items || items.length === 0) errors.items = "Your cart is empty.";
  if (!paymentMethod) errors.paymentMethod = "Select a payment method.";
  if (paymentMethod !== "cod" && !paymentReference?.trim()) {
    errors.paymentReference = "A transaction ID / reference number is required for advance payment.";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 400 });
  }

  // ---- PRICE & STOCK: backend is the source of truth ----
  const orderItems: OrderItem[] = [];
  for (const item of items) {
    const product = await getLiveProductById(item.productId);
    if (!product) {
      return NextResponse.json({ error: `Product ${item.productId} no longer exists.` }, { status: 400 });
    }
    if (item.quantity < 1) {
      return NextResponse.json({ error: "Invalid quantity." }, { status: 400 });
    }
    orderItems.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      unitPrice: product.price, // server price, never trust client-sent price
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    });
  }

  const reservation = await reserveStockForOrder(items);
  if (!reservation.ok) {
    const product = await getLiveProductById(reservation.problemProductId);
    return NextResponse.json(
      { error: `Not enough stock for "${product?.name ?? reservation.problemProductId}".` },
      { status: 409 }
    );
  }

  const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);
  const businessSettings = await getBusinessSettings();
  const deliveryCharge =
    businessSettings.freeDeliveryThreshold && subtotal >= businessSettings.freeDeliveryThreshold
      ? 0
      : businessSettings.deliveryCharge;
  const grandTotal = subtotal + deliveryCharge;

  const order: Order = {
    orderId: generateOrderId(),
    customer,
    delivery,
    items: orderItems,
    subtotal,
    deliveryCharge,
    grandTotal,
    paymentMethod,
    paymentStatus: paymentMethod === "cod" ? "unpaid-cod" : "pending-verification",
    paymentReference,
    paymentScreenshotUrl,
    orderStatus: "order-placed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    statusHistory: [{ status: "order-placed", at: new Date().toISOString() }],
  };

  await createOrder(order);

  // Fire-and-forget emails (architecture is real; see lib/email.ts for activation).
  sendAdminNewOrderEmail(order).catch(() => {});
  sendCustomerConfirmationEmail(order).catch(() => {});

  return NextResponse.json({ order }, { status: 201 });
}
