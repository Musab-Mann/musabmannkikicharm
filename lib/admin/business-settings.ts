import { supabaseAdmin } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/config";

/**
 * Fields an admin can change from /admin/settings without editing source
 * code. Everything not listed here (site name, shipping label text, social
 * links, etc.) still comes from lib/config.ts — this is deliberately scoped
 * to the fields the security brief calls out (contact + payment details),
 * not a full CMS.
 */
export interface BusinessSettings {
  businessEmail: string;
  phone: string;
  whatsapp: string;
  bankName: string;
  bankAccountTitle: string;
  bankAccountNumber: string;
  easypaisaAccountName: string;
  easypaisaAccountNumber: string;
  jazzcashAccountName: string;
  jazzcashAccountNumber: string;
  deliveryCharge: number;
  freeDeliveryThreshold: number | null;
}

function defaults(): BusinessSettings {
  return {
    businessEmail: siteConfig.business.email,
    phone: siteConfig.business.phone,
    whatsapp: siteConfig.business.whatsapp,
    bankName: siteConfig.payment.bank.bankName,
    bankAccountTitle: siteConfig.payment.bank.accountTitle,
    bankAccountNumber: siteConfig.payment.bank.accountNumber,
    easypaisaAccountName: siteConfig.payment.easypaisa.accountName,
    easypaisaAccountNumber: siteConfig.payment.easypaisa.accountNumber,
    jazzcashAccountName: siteConfig.payment.jazzcash.accountName,
    jazzcashAccountNumber: siteConfig.payment.jazzcash.accountNumber,
    deliveryCharge: siteConfig.shipping.deliveryCharge,
    freeDeliveryThreshold: siteConfig.shipping.freeDeliveryThreshold,
  };
}

const SETTINGS_KEY = "business";

/** Reads DB overrides and merges them on top of the static defaults — a
 * setting an admin never touched simply falls back to lib/config.ts. */
export async function getBusinessSettings(): Promise<BusinessSettings> {
  const base = defaults();
  try {
    const { data, error } = await supabaseAdmin
      .from("business_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (error || !data) return base;
    return { ...base, ...(data.value as Partial<BusinessSettings>) };
  } catch (e) {
    console.error("getBusinessSettings error (falling back to defaults):", e);
    return base;
  }
}

export async function updateBusinessSettings(
  patch: Partial<BusinessSettings>,
  updatedBy: string
): Promise<BusinessSettings> {
  const current = await getBusinessSettings();
  const merged = { ...current, ...patch };

  const { error } = await supabaseAdmin.from("business_settings").upsert({
    key: SETTINGS_KEY,
    value: merged,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  });
  if (error) {
    console.error("updateBusinessSettings error:", error);
    throw new Error("Failed to save business settings");
  }
  return merged;
}
