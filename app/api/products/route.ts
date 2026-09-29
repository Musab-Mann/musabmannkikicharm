import { NextRequest, NextResponse } from "next/server";
import { getLiveProducts, adminCreateProduct } from "@/lib/store/db";
import { isAdminRequestAuthed } from "@/lib/auth";
import { Product } from "@/lib/types";

export async function GET() {
  const products = await getLiveProducts();
  // s-maxage lets a CDN/edge (Vercel, Cloudflare) cache this response and
  // serve it to many requests without hitting the app server each time;
  // stale-while-revalidate serves the last-known-good response instantly
  // while a fresh copy is fetched in the background, so nobody waits on a
  // slow DB round-trip. The underlying data itself is already cached (see
  // the CACHING STRATEGY note in lib/store/db.ts) and invalidated on
  // writes, so this header is a second, CDN-facing layer on top of that,
  // not a replacement for it.
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } }
  );
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequestAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();

  if (!body.name || !body.category || typeof body.price !== "number") {
    return NextResponse.json({ error: "name, category and price are required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const product: Product = {
    id: `LA-ADM-${Date.now()}`,
    name: body.name,
    category: body.category,
    subcategory: body.subcategory || body.name,
    description: body.description || "",
    image: body.image || "/images/products/placeholder.jpg",
    additionalImages: Array.isArray(body.additionalImages) ? body.additionalImages : [],
    price: body.price,
    originalPrice: body.originalPrice ?? null,
    stock: body.stock ?? 0,
    rating: 0,
    reviewCount: 0,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    featured: !!body.featured,
    bestseller: !!body.bestseller,
    trending: !!body.trending,
    newArrival: !!body.newArrival,
    isDemoData: false,
  };

  await adminCreateProduct(product);
  return NextResponse.json({ product }, { status: 201 });
}
