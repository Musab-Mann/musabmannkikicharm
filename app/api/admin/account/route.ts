import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin/session";
import { getAdminById, updateAdminCredentials, getAdminByUsername, revokeAllSessions, logAdminEvent } from "@/lib/admin/db";
import { hashPassword, verifyPassword } from "@/lib/admin/crypto";
import { getClientIp } from "@/lib/admin/rate-limit";
import { sendAdminSecurityAlertEmail } from "@/lib/email";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await getAdminById(session.adminId);
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    username: admin.username,
    securityEmail: admin.securityEmail,
  });
}

type ChangeType = "username" | "password" | "email";

/**
 * All sensitive account changes require the CURRENT password, even though
 * the caller already has a valid session — a session alone must never be
 * enough to change credentials. (The old TOTP/authenticator-app
 * confirmation step has been removed entirely; password re-entry is the
 * re-authentication step now.) On success: revokes every other session
 * (keeps this one), logs the change, and emails the (old, pre-change)
 * security email so the real owner finds out even if an attacker changed
 * it. Changing the security email takes effect immediately — there is no
 * separate "verify the new email first" step, by design: the admin is
 * already authenticated and intentionally making the change.
 */
export async function PATCH(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await getAdminById(session.adminId);
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    type?: ChangeType;
    currentPassword?: string;
    newUsername?: string;
    newPassword?: string;
    newEmail?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { type, currentPassword } = body;
  if (!type || !currentPassword) {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  }

  const passwordOk = await verifyPassword(currentPassword, admin.passwordHash);

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  if (!passwordOk) {
    return NextResponse.json({ error: "Re-authentication failed. Check your current password." }, { status: 401 });
  }

  const notifyEmail = admin.securityEmail; // notify the OLD address, even if email itself is being changed
  let auditEvent: "username_changed" | "password_changed" | "email_changed";
  let alertTitle: string;
  let alertDescription: string;

  if (type === "username") {
    const newUsername = String(body.newUsername ?? "").trim();
    if (newUsername.length < 3) return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
    const existing = await getAdminByUsername(newUsername);
    if (existing && existing.id !== admin.id) {
      return NextResponse.json({ error: "That username is already in use." }, { status: 409 });
    }
    await updateAdminCredentials(admin.id, { username: newUsername });
    auditEvent = "username_changed";
    alertTitle = "Admin username changed";
    alertDescription = `Your admin login username was changed to "${newUsername}".`;
  } else if (type === "password") {
    const newPassword = String(body.newPassword ?? "");
    if (newPassword.length < 12) return NextResponse.json({ error: "New password must be at least 12 characters." }, { status: 400 });
    await updateAdminCredentials(admin.id, { passwordHash: await hashPassword(newPassword) });
    auditEvent = "password_changed";
    alertTitle = "Admin password changed";
    alertDescription = "Your admin login password was changed.";
  } else if (type === "email") {
    const newEmail = String(body.newEmail ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    await updateAdminCredentials(admin.id, { securityEmail: newEmail });
    auditEvent = "email_changed";
    alertTitle = "Admin security email changed";
    alertDescription = `Your admin security/recovery email was changed to ${newEmail}.`;
  } else {
    return NextResponse.json({ error: "Unknown change type." }, { status: 400 });
  }

  // Any credential change invalidates every other session immediately.
  await revokeAllSessions(admin.id, session.sessionId);
  await logAdminEvent({ adminId: admin.id, event: auditEvent, success: true, ip, userAgent });

  if (notifyEmail) {
    await sendAdminSecurityAlertEmail(notifyEmail, { title: alertTitle, description: alertDescription, ip });
  }

  return NextResponse.json({ ok: true });
}
