import { verifyAdminSession } from "@/lib/admin/session";

/**
 * Server Component / Route Handler only (uses next/headers via
 * verifyAdminSession). This is the SAME function name/signature every
 * existing API route already imports, so no other file needed to change
 * when the auth system was rebuilt — it now performs full DB-backed
 * verification (signature + expiry + revocation + idle timeout) instead of
 * the old single-shared-password check.
 */
export async function isAdminRequestAuthed(): Promise<boolean> {
  const session = await verifyAdminSession();
  return session !== null;
}

/** Returns the verified admin's session, or null. Use when the caller needs
 * to know WHICH admin/session is acting (e.g. to write an audit log entry),
 * not just whether the request is authorized. */
export { verifyAdminSession } from "@/lib/admin/session";
