/**
 * Admin handover / credential-rotation terminal workflow.
 *
 *   npx tsx scripts/reset-admin.ts
 *   (or: npm run handover:admin)
 *
 * Use this when handing the project to its real owner, or any time the
 * admin credentials need to be rotated from a trusted terminal rather than
 * the web UI. It:
 *
 *   1. Loads .env.local.
 *   2. Finds the existing admin safely (refuses to guess if there's more
 *      than one; see create-admin.ts for the "first admin" case).
 *   3. Asks for a new username, new password, and new security email.
 *   4. Updates those credentials securely (Argon2id).
 *   5. Revokes all existing sessions.
 *   6. Optionally invalidates existing recovery codes and generates a
 *      fresh set of exactly 8 (shown once, hashed at rest) — there is no
 *      authenticator app to re-enroll; the new owner's first login simply
 *      emails them a 6-digit code, same as every other login.
 *
 * Requires .env.local to already have NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, and ADMIN_SESSION_SECRET set (see
 * .env.example). Run this locally, never as a public HTTP endpoint.
 */
import dotenv from "dotenv";
import * as readline from "readline/promises";
import { stdin, stdout } from "process";
import { createClient } from "@supabase/supabase-js";
import { hashPassword, sha256Hex, generateRecoveryCode } from "../lib/admin/crypto";

dotenv.config({ path: ".env.local" });

// Kept intentionally free of any "@/lib/..." alias import that depends on
// Next.js-only modules (config, session, db) — this script runs standalone
// under tsx, outside the Next.js runtime, so it talks to Supabase directly,
// same pattern as create-admin.ts.
const RECOVERY_CODE_COUNT = 8;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
    process.exit(1);
  }
  if (!process.env.ADMIN_SESSION_SECRET) {
    console.error(
      "ADMIN_SESSION_SECRET must be set in .env.local before running this.\n" +
        "Generate one with: openssl rand -hex 32"
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  const { data: admins, error } = await supabase.from("admin_users").select("id, username").limit(10);
  if (error) {
    console.error("Could not read admin_users:", error.message);
    process.exit(1);
  }
  if (!admins || admins.length === 0) {
    console.error("No admin account found. Use `npm run setup:admin` to create the first one.");
    process.exit(1);
  }
  if (admins.length > 1) {
    console.error("More than one admin exists. Refusing to guess which one to hand over.");
    console.error("Existing usernames:", admins.map((a) => a.username).join(", "));
    process.exit(1);
  }
  const admin = admins[0];
  console.log(`\nExisting admin found: ${admin.username}`);
  console.log("This will rotate its credentials and, if you choose, issue a fresh set of recovery codes.\n");

  const rl = readline.createInterface({ input: stdin, output: stdout });

  // ---- Step 3: new credentials ----
  const newUsername = (await rl.question("New admin username: ")).trim();
  const newSecurityEmail = (await rl.question("New security/recovery email: ")).trim();
  const newPassword = (await rl.question("New admin password (min 12 characters): ")).trim();

  if (!newUsername || newUsername.length < 3) {
    console.error("Username must be at least 3 characters.");
    rl.close();
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newSecurityEmail)) {
    console.error("Please enter a valid email address.");
    rl.close();
    process.exit(1);
  }
  if (newPassword.length < 12) {
    console.error("Password must be at least 12 characters.");
    rl.close();
    process.exit(1);
  }

  const resetRecoveryAnswer = (
    await rl.question("\nInvalidate existing recovery codes and issue a fresh set of 8 now? (y/N): ")
  )
    .trim()
    .toLowerCase();
  const shouldResetRecoveryCodes = resetRecoveryAnswer === "y" || resetRecoveryAnswer === "yes";

  // ---- Step 4: update username/password/security email ----
  const passwordHash = await hashPassword(newPassword);
  const { error: updateError } = await supabase
    .from("admin_users")
    .update({
      username: newUsername,
      password_hash: passwordHash,
      security_email: newSecurityEmail,
      failed_login_count: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", admin.id);
  if (updateError) {
    console.error("Failed to update admin credentials:", updateError.message);
    rl.close();
    process.exit(1);
  }
  console.log("\n✓ Username, password, and security email updated.");

  // ---- Step 5: rotating the password means every existing session should
  // be revoked so an old device's session cookie stops working immediately.
  await supabase.from("admin_sessions").update({ revoked: true }).eq("admin_id", admin.id);
  console.log("✓ All existing sessions revoked.");

  if (!shouldResetRecoveryCodes) {
    await supabase.from("admin_audit_log").insert({
      admin_id: admin.id,
      event: "password_changed",
      success: true,
      metadata: { source: "handover_script", recovery_codes_reset: false },
    });
    console.log("\nExisting recovery codes were left unchanged, as requested.");
    console.log("Done. Hand the new username/password to the account owner through a secure channel.\n");
    rl.close();
    return;
  }

  // ---- Step 6: invalidate old recovery codes and issue a fresh set of 8 ----
  await supabase.from("admin_recovery_codes").delete().eq("admin_id", admin.id);
  const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () => generateRecoveryCode());
  const rows = recoveryCodes.map((code) => ({ admin_id: admin.id, code_hash: sha256Hex(code) }));
  await supabase.from("admin_recovery_codes").insert(rows);

  await supabase.from("admin_audit_log").insert([
    { admin_id: admin.id, event: "recovery_codes_regenerated", success: true, metadata: { source: "handover_script" } },
    { admin_id: admin.id, event: "password_changed", success: true, metadata: { source: "handover_script", recovery_codes_reset: true } },
  ]);

  console.log("\n✓ Old recovery codes invalidated.\n");
  console.log("Save these recovery codes now — they are shown only once and only their hashes are stored:\n");
  recoveryCodes.forEach((c) => console.log("  " + c));
  console.log(
    "\nDone. The account now has: the new username/password, and a new set of 8 recovery codes. The\n" +
      "previous owner's recovery codes and sessions no longer work. The new owner's first login will\n" +
      "simply email a 6-digit code to the new security email above — no authenticator app is used.\n" +
      "Hand the credentials above to the account owner through a secure channel — do not paste them\n" +
      "into chat, email, or a committed file.\n"
  );

  rl.close();
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
