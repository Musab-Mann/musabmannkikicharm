import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrderStatus } from "@/lib/store/db";
import { isAdminRequestAuthed } from "@/lib/auth";
import { sendOrderStatusUpdateEmail } from "@/lib/email";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequestAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequestAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
const { id } = await params;

const order = await updateOrderStatus(id, {
    orderStatus: body.orderStatus,
    paymentStatus: body.paymentStatus,
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (body.orderStatus) {
    sendOrderStatusUpdateEmail(order).catch(() => {});
  }

  return NextResponse.json({ order });
}
