/**
 * KIKICHARMS — CENTRAL CONFIGURATION
 * ----------------------------------------------------------------
 * Every business detail used anywhere on the site is read from here.
 * Change your WhatsApp number, delivery charges, payment details,
 * or social links in ONE place — nothing else needs to be touched.
 *
 * Values that are sensitive or business-specific but were not given
 * to me are left as clearly labeled placeholders. Replace them before
 * launch. Nothing here is invented banking/payment data.
 */

export const siteConfig = {
  business: {
    name: "Kikicharms",
    tagline: "Handmade jewelry, charms & bead craft",
    // Confirmed by business owner:
    whatsapp: "+923129667912",
    phone: "+923129667912",
    // Not provided — placeholder, edit before launch:
    email: "gildedgracebyeh@gmail.com",
    address: "Rawalpindi, Punjab, Pakistan",
  },

  shipping: {
    deliveryTimeLabel: "4–5 Working Days",
    deliveryCharge: 200, // PKR — editable
    freeDeliveryThreshold: 5000, // PKR — orders at/above this ship free; set to null to disable
  },

  payment: {
    codEnabled: true,
    payNowEnabled: true,
    easypaisa: {
      accountName: "Eshal Sohail",
      accountNumber: "+92 312 9667912",
    },
    bank: {
      bankName: "Askari Bank",
      accountTitle: "Eshal sohail",
      accountNumber: "01143230001960",
      iban: "PKXX REPLACE WITH REAL IBAN",
    },
    // Not provided — placeholder, fill in from /admin/settings before enabling JazzCash at checkout:
    jazzcash: {
      accountName: "REPLACE WITH REAL ACCOUNT NAME",
      accountNumber: "REPLACE WITH REAL ACCOUNT NUMBER",
    },
  },

  social: {
    instagram: "https://www.instagram.com/kikicharms.pk?stkn=b205YTlwbjdzdWFs&utm_source=qr",
    tiktok: "https://www.tiktok.com/@kikicharms.pk?_r=1&_t=ZS-99VYhPjZwif",
  },

  email_system: {
    // See README.md → "Connecting real email" for setup instructions.
    // Reads from process.env at request time — never hard-code keys here.
    adminEmailEnvVar: "ADMIN_EMAIL",
    businessEmailEnvVar: "BUSINESS_EMAIL",
    apiKeyEnvVar: "EMAIL_API_KEY",
    provider: "resend", // "resend" | "sendgrid"
  },

  admin: {
    // See README.md — set ADMIN_PASSWORD in your .env.local
    loginPath: "/admin/login",
  },
} as const;

/**
 * Builds a wa.me link with a prefilled message. Accepts an optional
 * `numberOverride` — pages that have already loaded live business settings
 * (from /api/business-settings, or directly from getBusinessSettings() in a
 * server component) pass the current admin-configured number here so the
 * link always points at whatever number is live today, not the source-code
 * default. Falls back to the static config when no override is given, so
 * every existing call site keeps working unchanged.
 */
export function buildWhatsAppLink(message?: string, numberOverride?: string) {
  const number = (numberOverride || siteConfig.business.whatsapp).replace(/[^\d]/g, "");
  const text = encodeURIComponent(
    message || "Hi, I would like to know more about your products."
  );
  return `https://wa.me/${number}?text=${text}`;
}

export function buildOrderWhatsAppLink(productName: string, orderId?: string, numberOverride?: string) {
  const msg = orderId
    ? `Hi, I would like to ask about my order for ${productName}. Order ID: ${orderId}`
    : `Hi, I would like to place an order for ${productName}.`;
  return buildWhatsAppLink(msg, numberOverride);
}

export function buildTelLink(numberOverride?: string) {
  return `tel:${numberOverride || siteConfig.business.phone}`;
}
