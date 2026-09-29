import { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import { ORDER_STATUS_LABELS } from "@/lib/types";

/**
 * EMAIL NOTIFICATION ARCHITECTURE
 * ----------------------------------------------------------------
 * Server-side only. Never import this file from a client component.
 *
 * To activate real emails, set these in .env.local (see README.md):
 *   EMAIL_API_KEY   — your Resend (or SendGrid) API key
 *   ADMIN_EMAIL     — where "new order" notifications are sent
 *   BUSINESS_EMAIL  — the "from" address customers see
 *
 * Until EMAIL_API_KEY is set, sendEmail() safely no-ops and logs to
 * the server console instead of pretending an email was sent. Check
 * your terminal output during local testing.
 */

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

const EMAIL_TIMEOUT_MS = 8000;
const EMAIL_MAX_ATTEMPTS = 3;
// Base delay for exponential backoff between retries (200ms, 400ms, ...).
const EMAIL_RETRY_BASE_MS = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resend API call is a real outbound network dependency, so it gets its
 * own timeout (via AbortController, since a hung TLS handshake or a slow
 * provider must never hang a request handler indefinitely) and a small
 * bounded retry with exponential backoff for transient failures (network
 * errors, timeouts, and 5xx/429 provider responses). 4xx errors other than
 * 429 are treated as permanent (bad payload/auth) and are not retried.
 * This is a resilience measure, not a queue: if every attempt fails, the
 * caller is told delivery failed and the caller decides what to do next —
 * emails are never silently dropped or infinitely retried.
 */
async function sendEmailAttempt(payload: EmailPayload, apiKey: string, from: string): Promise<{ ok: true } | { ok: false; retryable: boolean; reason: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);
  try {
    // Resend API — https://resend.com/docs/api-reference/emails/send-email
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${siteConfig.business.name} <${from}>`,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Email send failed:", res.status, text);
      const retryable = res.status === 429 || res.status >= 500;
      return { ok: false, retryable, reason: `Provider error ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error(aborted ? "Email send timed out" : "Email send threw an error:", aborted ? "" : err);
    // Network errors and timeouts are treated as transient/retryable.
    return { ok: false, retryable: true, reason: aborted ? "Timed out" : "Network/provider error" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.BUSINESS_EMAIL || siteConfig.business.email;

  if (!apiKey) {
    console.log("---- EMAIL NOT SENT (EMAIL_API_KEY missing) ----");
    console.log("To:", payload.to);
    console.log("Subject:", payload.subject);
    console.log("(Set EMAIL_API_KEY, ADMIN_EMAIL, BUSINESS_EMAIL in .env.local to enable real delivery.)");
    console.log("-------------------------------------------------");
    return { sent: false, reason: "EMAIL_API_KEY not configured" };
  }

  let lastReason = "Unknown error";
  for (let attempt = 1; attempt <= EMAIL_MAX_ATTEMPTS; attempt++) {
    const result = await sendEmailAttempt(payload, apiKey, from);
    if (result.ok) return { sent: true };
    lastReason = result.reason;
    if (!result.retryable || attempt === EMAIL_MAX_ATTEMPTS) break;
    await sleep(EMAIL_RETRY_BASE_MS * 2 ** (attempt - 1));
  }
  return { sent: false, reason: lastReason };
}

function orderItemsHtml(order: Order) {
  return order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 10px;">${i.name}</td><td style="padding:6px 10px;">x${i.quantity}</td><td style="padding:6px 10px;">${formatPrice(i.subtotal)}</td></tr>`
    )
    .join("");
}

export async function sendAdminNewOrderEmail(order: Order) {
  const adminEmail = process.env.ADMIN_EMAIL || siteConfig.business.email;
  const html = `
    <h2>New Order Received — ${order.orderId}</h2>
    <p><b>Customer:</b> ${order.customer.fullName}<br/>
    <b>Email:</b> ${order.customer.email}<br/>
    <b>WhatsApp:</b> ${order.customer.whatsapp}<br/>
    <b>Phone:</b> ${order.customer.phone}</p>
    <p><b>Address:</b> ${order.delivery.address}, ${order.delivery.area}, ${order.delivery.city} ${order.delivery.postalCode}</p>
    <table border="0" cellspacing="0">${orderItemsHtml(order)}</table>
    <p><b>Subtotal:</b> ${formatPrice(order.subtotal)}<br/>
    <b>Delivery:</b> ${formatPrice(order.deliveryCharge)}<br/>
    <b>Total:</b> ${formatPrice(order.grandTotal)}</p>
    <p><b>Payment method:</b> ${order.paymentMethod}<br/>
    <b>Payment status:</b> ${order.paymentStatus}<br/>
    <b>Order status:</b> ${ORDER_STATUS_LABELS[order.orderStatus]}</p>
    <p>Estimated delivery: ${siteConfig.shipping.deliveryTimeLabel}</p>
  `;
  return sendEmail({ to: adminEmail, subject: `New Order — ${order.orderId}`, html });
}

export async function sendCustomerConfirmationEmail(order: Order) {
  const html = `
    <h2>Thank you for your order! ✨</h2>
    <p>Your order <b>${order.orderId}</b> has been received.</p>
    <table border="0" cellspacing="0">${orderItemsHtml(order)}</table>
    <p><b>Total:</b> ${formatPrice(order.grandTotal)}<br/>
    <b>Payment method:</b> ${order.paymentMethod}<br/>
    <b>Payment status:</b> ${order.paymentStatus}</p>
    <p><b>Delivering to:</b> ${order.delivery.address}, ${order.delivery.area}, ${order.delivery.city}</p>
    <p>Estimated delivery: ${siteConfig.shipping.deliveryTimeLabel}</p>
    <p>Order status: ${ORDER_STATUS_LABELS[order.orderStatus]}</p>
  `;
  return sendEmail({ to: order.customer.email, subject: `Order Confirmed — ${order.orderId}`, html });
}

export async function sendOrderStatusUpdateEmail(order: Order) {
  const messages: Record<string, string> = {
    "order-confirmed": "Your order has been confirmed.",
    processing: "Your order is now being processed.",
    shipped: "Your order has been shipped.",
    "out-for-delivery": "Your order is out for delivery.",
    delivered: "Your order has been delivered. We hope you love it!",
    cancelled: "Your order has been cancelled.",
  };
  const message = messages[order.orderStatus] || `Order status updated: ${ORDER_STATUS_LABELS[order.orderStatus]}`;
  const html = `<h2>${message}</h2><p>Order ID: <b>${order.orderId}</b></p>`;
  return sendEmail({ to: order.customer.email, subject: `Order Update — ${order.orderId}`, html });
}

/**
 * Admin security notification — sent on username/password/email changes
 * and recovery-code regeneration. Never includes the password or recovery
 * codes themselves, only metadata about the change, per the security
 * brief.
 */
export async function sendAdminSecurityAlertEmail(
  toEmail: string,
  params: { title: string; description: string; ip?: string | null }
) {
  const when = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
  const html = `
    <h2>Security alert — ${params.title}</h2>
    <p>${params.description}</p>
    <p><b>When:</b> ${when} (PKT)<br/>
    ${params.ip ? `<b>IP address:</b> ${params.ip}<br/>` : ""}</p>
    <p style="color:#b91c1c;"><b>If you did not make this change, someone else may have access to your admin
    account.</b> Log in immediately, change your password, and review Security → Sessions to revoke
    any sessions you don't recognize.</p>
  `;
  return sendEmail({ to: toEmail, subject: `KKCharm Admin — ${params.title}`, html });
}

/**
 * Admin login verification code email — the second factor sent on every
 * admin login after username+password succeed. Carries only a short-lived,
 * single-use numeric code — never the admin's password, never a link that
 * skips entering it.
 */
export async function sendAdminLoginOtpEmail(
  toEmail: string,
  params: { code: string; ip?: string | null }
) {
  const when = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
  const html = `
    <h2>Your admin login verification code</h2>
    <p>Use this code to finish logging in to the KKCharm admin panel:</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:6px;background:#f5f5f5;padding:14px 20px;
       border-radius:8px;display:inline-block;">${params.code}</p>
    <p><b>When requested:</b> ${when} (PKT)<br/>
    ${params.ip ? `<b>IP address:</b> ${params.ip}<br/>` : ""}</p>
    <p>This code expires in 10 minutes and can only be used once.</p>
    <p>If you did not just try to log in, someone else may have your password — change it as soon as
    possible from a device you trust, and review Security → Sessions to revoke any sessions you don't
    recognize.</p>
  `;
  return sendEmail({ to: toEmail, subject: "KKCharm Admin — Your login verification code", html });
}

/**
 * Password-reset verification code email. Carries only a short-lived,
 * single-use numeric code — never the admin's password itself, never a
 * link that bypasses the recovery-code check. The code is required, but is
 * only step 1 of 3 in the reset flow (email code → recovery code → new
 * password); see /api/admin/forgot-password.
 */
export async function sendAdminPasswordResetCodeEmail(
  toEmail: string,
  params: { code: string; ip?: string | null }
) {
  const when = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
  const html = `
    <h2>Your admin password reset code</h2>
    <p>A password reset was requested for your KKCharm admin account. Enter this code on the
    password reset page to continue:</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:6px;background:#f5f5f5;padding:14px 20px;
       border-radius:8px;display:inline-block;">${params.code}</p>
    <p><b>When requested:</b> ${when} (PKT)<br/>
    ${params.ip ? `<b>IP address:</b> ${params.ip}<br/>` : ""}</p>
    <p>This code expires in 15 minutes and can only be used once. After entering it you will also need
    one of your 8 saved recovery codes before you can set a new password.</p>
    <p>If you did not request this, you can safely ignore this email — no changes will be made to your
    account without both the code above and a valid recovery code.</p>
  `;
  return sendEmail({ to: toEmail, subject: "KKCharm Admin — Your password reset code", html });
}
