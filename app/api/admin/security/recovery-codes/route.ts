import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin/session";
import { getAdminById, storeRecoveryCodes, countUnusedRecoveryCodes, logAdminEvent } from "@/lib/admin/db";
import { verifyPassword, generateRecoveryCode, sha256Hex } from "@/lib/admin/crypto";
import { getClientIp } from "@/lib/admin/rate-limit";
import { sendAdminSecurityAlertEmail } from "@/lib/email";
import { RECOVERY_CODE_COUNT } from "@/lib/admin/recovery-codes";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const remaining = await countUnusedRecoveryCodes(session.adminId);
  return NextResponse.json({ remaining });
}

/**
 * Invalidates all existing recovery codes and issues exactly 8 new ones
 * (shown once, only their hashes stored). Requires the admin's current
 * password — the account's authenticator-based second factor has been
 * removed entirely, so recovery codes are re-authenticated with the
 * password alone, matching every other sensitive change on this account
 * (see /api/admin/account).
 */
export async function POST(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await getAdminById(session.adminId);
  if (!admin) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  const passwordOk = await verifyPassword(String(body.password ?? ""), admin.passwordHash);
  if (!passwordOk) {
    await logAdminEvent({ adminId: admin.id, event: "recovery_codes_regenerated", success: false, ip, userAgent });
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () => generateRecoveryCode());
  await storeRecoveryCodes(admin.id, recoveryCodes.map((c) => sha256Hex(c)));
  await logAdminEvent({ adminId: admin.id, event: "recovery_codes_regenerated", success: true, ip, userAgent });

  // Every OTHER session loses nothing functionally (recovery codes are only
  // used for password reset), but the security email is notified so the
  // real owner learns about this immediately if they didn't do it.
  if (admin.securityEmail) {
    await sendAdminSecurityAlertEmail(admin.securityEmail, {
      title: "Recovery codes regenerated",
      description:
        "A new set of 8 recovery codes was generated for your admin account. The previous recovery codes no longer work.",
      ip,
    });
  }

  return NextResponse.json({ recoveryCodes });
}
