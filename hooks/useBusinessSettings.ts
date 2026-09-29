"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/config";

/**
 * Client-side mirror of lib/admin/business-settings.ts's BusinessSettings
 * shape. Kept as a plain interface (not imported from lib/admin/*) because
 * that module pulls in the server-only Supabase admin client — importing it
 * here would leak service-role code into the client bundle.
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

export const defaultBusinessSettings: BusinessSettings = {
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

/**
 * Fetches the live, admin-editable business settings (contact numbers,
 * payment details, delivery pricing) from the public /api/business-settings
 * endpoint. Every consumer starts with the static lib/config.ts defaults so
 * the page never shows a blank/loading state, then swaps in the live
 * values once the fetch resolves. A failed fetch (offline, cold start,
 * etc.) is swallowed on purpose — the page keeps showing the static
 * defaults rather than an error, since stale-but-correct contact info is
 * far better than a broken page.
 */
export function useBusinessSettings() {
  const [settings, setSettings] = useState<BusinessSettings>(defaultBusinessSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/business-settings")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.settings) {
          setSettings((s) => ({ ...s, ...data.settings }));
        }
      })
      .catch(() => {
        // Keep static defaults — see doc comment above.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loaded };
}
