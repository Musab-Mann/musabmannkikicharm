import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin/session";
import { getRecentAuditLog } from "@/lib/admin/db";

export async function GET(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(200, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 50));
  const entries = await getRecentAuditLog(limit);
  return NextResponse.json({ entries });
}
