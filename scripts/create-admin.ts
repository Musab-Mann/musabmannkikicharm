/**
 * One-time CLI bootstrap for the first admin account.
 * Run locally (never as a public HTTP endpoint) with:
 *   npx tsx scripts/create-admin.ts
 *
 * Requires .env.local to have NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, and ADMIN_SESSION_SECRET already set (see
 * .env.example).
 *
 * This script only creates the username, password, and security email.
 * There is no authenticator app to enroll: on first login, the admin signs
 * in with username + password, verifies a 6-digit code emailed to the
 * security email above, and is then shown 8 recovery codes (once) for
 * account recovery going forward.
 */
import dotenv from "dotenv";
import * as readline from "readline/promises";
import { stdin, stdout } from "process";
import { createClient } from "@supabase/supabase-js";
import { hashPassword } from "../lib/admin/crypto";

dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
    process.exit(1);
  }
  if (!process.env.ADMIN_SESSION_SECRET) {
    console.error(
      "ADMIN_SESSION_SECRET must be set in .env.local before creating an admin.\n" +
        "Generate one with: openssl rand -hex 32"
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  const { count, error: countError } = await supabase
    .from("admin_users")
    .select("*", { count: "exact", head: true });
  if (countError) {
    console.error(
      "Could not read admin_users — has the migration in supabase/migrations/001_phase1_phase2_phase3.sql been run yet?\n",
      countError.message
    );
    process.exit(1);
  }
  if (count && count > 0) {
    console.error(`An admin account already exists (${count} row(s) in admin_users). Refusing to create another via this script.`);
    console.error("To add a second admin, do it from the Admin Panel's account settings once logged in.");
    process.exit(1);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const username = (await rl.question("Admin username: ")).trim();
  const securityEmail = (await rl.question("Security/recovery email: ")).trim();
  const password = (await rl.question("Admin password (min 12 characters): ")).trim();
  rl.close();

  if (!username || username.length < 3) {
    console.error("Username must be at least 3 characters.");
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(securityEmail)) {
    console.error("Please enter a valid email address.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const { error } = await supabase.from("admin_users").insert({
    username,
    password_hash: passwordHash,
    security_email: securityEmail,
    mfa_enabled: false,
  });

  if (error) {
    console.error("Failed to create admin account:", error.message);
    process.exit(1);
  }

  console.log(`\nAdmin account "${username}" created.`);
  console.log("Next: log in at /admin/login with this username and password.");
  console.log("You will then enter a 6-digit code emailed to your security email, and be shown 8 recovery codes to save — this happens once, on your first login.\n");
}

main();
