import { NextRequest, NextResponse } from "next/server";
import { getBusinessSettings, updateBusinessSettings } from "@/lib/admin/business-settings";
import { verifyAdminSession } from "@/lib/admin/session";
import { logAdminEvent } from "@/lib/admin/db";
import { getClientIp } from "@/lib/admin/rate-limit";

/**
 * PUBLIC GET — every field here (WhatsApp number, phone, bank/Easypaisa
 * account for receiving payment) is already shown to any customer at
 * checkout today; there is nothing here that isn't already public on the
 * live site, so no auth is required to read it. Writing requires an admin
 * session (see PATCH).
 */
export async function GET() {
  const settings = await getBusinessSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let patch: Record<string, unknown>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const settings = await updateBusinessSettings(patch, session.adminId);

  await logAdminEvent({
    adminId: session.adminId,
    event: "business_settings_changed",
    success: true,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent"),
    metadata: { changedKeys: Object.keys(patch) },
  });

  return NextResponse.json({ settings });
}
