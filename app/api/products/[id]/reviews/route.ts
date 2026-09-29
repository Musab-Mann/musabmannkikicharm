import { NextRequest, NextResponse } from "next/server";
import { getReviewsForProduct } from "@/lib/store/db";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/admin/rate-limit";

export async function GET(
_req: NextRequest,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;

const reviews = await getReviewsForProduct(id);

return NextResponse.json({ reviews });
}

export async function POST(
req: NextRequest,
{ params }: { params: Promise<{ id: string }> }
) {
try {
const ip = getClientIp(req);
const limit = checkRateLimit(`review:create:${ip}`, 5, 10 * 60_000);

if (!limit.allowed) {
  return NextResponse.json(
    { error: "Too many reviews submitted. Please try again later." },
    { status: 429 }
  );
}

const body = await req.json();
const { id } = await params;

const customerName = String(body.customerName ?? "").trim().slice(0, 100);
const rating = Number(body.rating);
const text = String(body.text ?? "").trim().slice(0, 2000);

if (!customerName) {
  return NextResponse.json(
    { error: "Name is required" },
    { status: 400 }
  );
}

if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
  return NextResponse.json(
    { error: "Rating must be between 1 and 5" },
    { status: 400 }
  );
}

if (!text) {
  return NextResponse.json(
    { error: "Review text is required" },
    { status: 400 }
  );
}

const { data, error } = await supabaseAdmin
  .from("reviews")
  .insert({
    product_id: id,
    customer_name: customerName,
    rating,
    text,
    verified_purchase: false,
    is_demo_data: false,
  })
  .select()
  .single();

if (error) {
  console.error("Supabase create review error:", error);

  return NextResponse.json(
    { error: "Failed to submit review" },
    { status: 500 }
  );
}

return NextResponse.json(
  {
    review: {
      id: data.id,
      productId: data.product_id,
      customerName: data.customer_name,
      rating: data.rating,
      text: data.text ?? "",
      date: data.created_at,
      verifiedPurchase: data.verified_purchase ?? false,
      isDemoData: data.is_demo_data ?? false,
    },
  },
  { status: 201 }
);


} catch (error) {
console.error("Review POST error:", error);

return NextResponse.json(
  { error: "Invalid request" },
  { status: 400 }
);


}
}
