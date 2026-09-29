import { NextRequest, NextResponse } from "next/server";

import {
getLiveProductById,
adminUpdateProduct,
adminDeleteProduct,
} from "@/lib/store/db";

import { isAdminRequestAuthed } from "@/lib/auth";

export async function GET(
_req: NextRequest,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;

const product = await getLiveProductById(id);

if (!product) {
return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// See app/api/products/route.ts for why this header exists.

return NextResponse.json(
{ product },
{
headers: {
"Cache-Control":
"public, s-maxage=30, stale-while-revalidate=300",
},
}
);
}

export async function PATCH(
req: NextRequest,
{ params }: { params: Promise<{ id: string }> }
) {
if (!(await isAdminRequestAuthed())) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const { id } = await params;
const patch = await req.json();

await adminUpdateProduct(id, patch);

const product = await getLiveProductById(id);

return NextResponse.json({ product });
}

export async function DELETE(
_req: NextRequest,
{ params }: { params: Promise<{ id: string }> }
) {
if (!(await isAdminRequestAuthed())) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const { id } = await params;

await adminDeleteProduct(id);

return NextResponse.json({ ok: true });
}
