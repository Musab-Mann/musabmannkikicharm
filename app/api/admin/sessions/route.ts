import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin/session";
import { listActiveSessions, revokeAllSessions, logAdminEvent } from "@/lib/admin/db";
import { getClientIp } from "@/lib/admin/rate-limit";

export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await listActiveSessions(session.adminId);
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      current: s.id === session.sessionId,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      ip: s.ip,
      userAgent: s.userAgent,
    })),
  });
}

/** "Log out all other sessions" — keeps the current session alive. */
export async function DELETE(req: NextRequest) {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await revokeAllSessions(session.adminId, session.sessionId);
  await logAdminEvent({
    adminId: session.adminId,
    event: "all_sessions_revoked",
    success: true,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true });
}
