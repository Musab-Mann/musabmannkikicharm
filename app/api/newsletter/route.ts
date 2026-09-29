import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/admin/rate-limit";
import { isValidEmail } from "@/lib/utils";

/**
 * Generic contact-form submission endpoint. Logs server-side and,
 * once EMAIL_API_KEY is configured (see lib/email.ts / README.md),
 * can be wired to forward the message to ADMIN_EMAIL the same way
 * order notifications are sent.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(`newsletter:${ip}`, 5, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  let body: { name?: string; email?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 100);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const message = String(body.message ?? "").trim().slice(0, 2000);

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  console.log("---- CONTACT FORM SUBMISSION ----", { name, email, message });
  return NextResponse.json({ ok: true });
}
