// Recovery codes replace Google Authenticator/TOTP-based recovery entirely.
// Exactly 8 codes are issued at a time: on first successful login setup
// (see app/api/admin/login/otp/verify/route.ts) and whenever the admin
// explicitly regenerates them (see app/api/admin/security/recovery-codes).
export const RECOVERY_CODE_COUNT = 8;
