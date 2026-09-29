import { randomBytes, randomInt, createHash, timingSafeEqual, createCipheriv, createDecipheriv } from "crypto";
import { argon2id, argon2Verify } from "hash-wasm";

/**
 * Password hashing: Argon2id via `hash-wasm` (WebAssembly implementation —
 * no native binary to compile, so it installs and runs identically on
 * local dev, CI, and Vercel's serverless Node runtime). Parameters below
 * follow OWASP's current minimum recommendation for Argon2id.
 */
const ARGON2_PARAMS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 19456, // 19 MiB
  hashLength: 32,
  outputType: "encoded" as const,
};

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return argon2id({ password, salt, ...ARGON2_PARAMS });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    return false;
  }
}

/** High-entropy random tokens (session tokens, recovery codes) — hex string. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * SHA-256 is used (not Argon2) for session tokens and recovery codes because
 * both are already high-entropy, machine-generated random values, not
 * user-chosen secrets — a fast, non-memory-hard hash is the correct tool
 * here since there is no brute-forceable "guessing" attack surface. Argon2id
 * is reserved for the admin login password, which is a human-chosen secret.
 */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Constant-time string comparison, for recovery-code / token matching. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Encrypts the TOTP secret at rest with AES-256-GCM, using a key that is
 * dedicated to this purpose and separate from ADMIN_SESSION_SECRET — a leak
 * of one does not compromise the other. Fails closed in production if the
 * key is missing or malformed, same policy as the session secret.
 */
function getMfaKey(): Buffer {
  const key = process.env.ADMIN_MFA_ENCRYPTION_KEY;
  if (!key || !/^[0-9a-f]{64}$/i.test(key)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ADMIN_MFA_ENCRYPTION_KEY is not set (must be a 64-character hex string = 32 bytes). " +
          "Production refuses to start MFA without it. Generate one with: openssl rand -hex 32"
      );
    }
    return createHash("sha256").update("dev-only-ephemeral-mfa-key").digest();
  }
  return Buffer.from(key, "hex");
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getMfaKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  const decipher = createDecipheriv("aes-256-gcm", getMfaKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf-8");
}

/**
 * Cryptographically random numeric code (e.g. for the password-reset email
 * verification step). Uses `crypto.randomInt`, which is uniformly
 * distributed over the requested range (unlike `randomBytes(...) % 10`,
 * which is subtly biased) — the same rigor as the rest of this module.
 */
export function generateNumericCode(digits = 6): string {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits; // exclusive upper bound for randomInt
  return String(randomInt(min, max));
}

/** Human-friendly single-use recovery codes, e.g. "7F3K-9QXZ-2MNB". */
export function generateRecoveryCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += chars[bytes[i] % chars.length];
    if (i === 3 || i === 7) out += "-";
  }
  return out;
}
