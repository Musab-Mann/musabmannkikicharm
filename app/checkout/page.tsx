"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice, isValidEmail, isValidPKPhone } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import type { PaymentMethod } from "@/lib/types";
import PageAccent from "@/components/PageAccent";
import ScrollReveal from "@/components/ScrollReveal";

interface BusinessSettings {
  bankName: string;
  bankAccountTitle: string;
  bankAccountNumber: string;
  easypaisaAccountName: string;
  easypaisaAccountNumber: string;
  deliveryCharge: number;
  freeDeliveryThreshold: number | null;
}

const defaultSettings: BusinessSettings = {
  bankName: siteConfig.payment.bank.bankName,
  bankAccountTitle: siteConfig.payment.bank.accountTitle,
  bankAccountNumber: siteConfig.payment.bank.accountNumber,
  easypaisaAccountName: siteConfig.payment.easypaisa.accountName,
  easypaisaAccountNumber: siteConfig.payment.easypaisa.accountNumber,
  deliveryCharge: siteConfig.shipping.deliveryCharge,
  freeDeliveryThreshold: siteConfig.shipping.freeDeliveryThreshold,
};

type FormState = {
  fullName: string;
  email: string;
  whatsapp: string;
  phone: string;
  address: string;
  area: string;
  city: string;
  postalCode: string;
  instructions: string;
};

const emptyForm: FormState = {
  fullName: "",
  email: "",
  whatsapp: "",
  phone: "",
  address: "",
  area: "",
  city: "",
  postalCode: "",
  instructions: "",
};

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [paymentReference, setPaymentReference] = useState("");
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);

  useEffect(() => {
    fetch("/api/business-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings) setSettings((s) => ({ ...s, ...data.settings }));
      })
      .catch(() => {
        // Network hiccup — keep the static defaults already shown. Nothing
        // breaks; the customer just sees the source-code default values
        // instead of the latest admin-edited ones for this one page load.
      });
  }, []);

  const deliveryCharge =
    settings.freeDeliveryThreshold && subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryCharge;
  const grandTotal = subtotal + deliveryCharge;

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) next.fullName = "Full name is required.";
    if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";
    if (!isValidPKPhone(form.whatsapp)) next.whatsapp = "Enter a valid WhatsApp number (e.g. 03XXXXXXXXX).";
    if (!isValidPKPhone(form.phone)) next.phone = "Enter a valid phone number.";
    if (!form.address.trim()) next.address = "Street address is required.";
    if (!form.city.trim()) next.city = "City is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (items.length === 0) {
      setServerError("Your cart is empty.");
      return;
    }
    if (!validate()) return;
    if (paymentMethod !== "cod" && !paymentReference.trim()) {
      setErrors((prev) => ({ ...prev }));
      setServerError("Please enter your transaction ID / reference number for advance payment.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            fullName: form.fullName,
            email: form.email,
            whatsapp: form.whatsapp,
            phone: form.phone,
          },
          delivery: {
            address: form.address,
            area: form.area,
            city: form.city,
            postalCode: form.postalCode,
            instructions: form.instructions,
          },
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          paymentMethod,
          paymentReference: paymentMethod !== "cod" ? paymentReference : undefined,
          paymentScreenshotUrl: screenshotName ? `pending-upload:${screenshotName}` : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Something went wrong placing your order.");
        setSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/order-confirmation/${data.order.orderId}`);
    } catch {
      setServerError("Network error — please check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-10 md:py-16">
      <PageAccent tone="champagne" />
      <h1 className="font-display text-3xl mb-8">Checkout</h1>
      <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-8">
          <ScrollReveal>
          <section>
            <h2 className="text-[11px] font-mono tracking-widest text-bronze mb-4">CUSTOMER INFORMATION</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full Name" error={errors.fullName}>
                <input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className="input" />
              </Field>
              <Field label="Email Address" error={errors.email}>
                <input value={form.email} onChange={(e) => update("email", e.target.value)} className="input" type="email" />
              </Field>
              <Field label="WhatsApp Number" error={errors.whatsapp}>
                <input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} className="input" placeholder="03XXXXXXXXX" />
              </Field>
              <Field label="Phone Number" error={errors.phone}>
                <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="input" placeholder="03XXXXXXXXX" />
              </Field>
            </div>
          </section>
          </ScrollReveal>

          <ScrollReveal delay={60}>
          <section>
            <h2 className="text-[11px] font-mono tracking-widest text-bronze mb-4">DELIVERY INFORMATION</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="House / Street Address" error={errors.address} full>
                <input value={form.address} onChange={(e) => update("address", e.target.value)} className="input" />
              </Field>
              <Field label="Area">
                <input value={form.area} onChange={(e) => update("area", e.target.value)} className="input" />
              </Field>
              <Field label="City" error={errors.city}>
                <input value={form.city} onChange={(e) => update("city", e.target.value)} className="input" />
              </Field>
              <Field label="Postal Code">
                <input value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} className="input" />
              </Field>
              <Field label="Additional Delivery Instructions" full>
                <textarea
                  value={form.instructions}
                  onChange={(e) => update("instructions", e.target.value)}
                  className="input"
                  rows={3}
                />
              </Field>
            </div>
          </section>
          </ScrollReveal>

          <ScrollReveal delay={120}>
          <section>
            <h2 className="text-[11px] font-mono tracking-widest text-bronze mb-4">PAYMENT METHOD</h2>
            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-xl border border-line p-4 cursor-pointer transition-colors duration-200 hover:border-gold/60 has-[:checked]:border-gold">
                <input type="radio" name="pm" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Cash on Delivery</p>
                  <p className="text-xs text-bronze mt-0.5">Pay when your order is delivered.</p>
                </div>
              </label>

              {siteConfig.payment.payNowEnabled && (
                <>
                  <label className="flex items-start gap-3 rounded-xl border border-line p-4 cursor-pointer transition-colors duration-200 hover:border-gold/60 has-[:checked]:border-gold">
                    <input type="radio" name="pm" checked={paymentMethod === "easypaisa"} onChange={() => setPaymentMethod("easypaisa")} className="mt-1" />
                    <div>
                      <p className="font-medium text-sm">Pay Now — EasyPaisa</p>
                      <p className="text-xs text-bronze mt-0.5">
                        Send to {settings.easypaisaAccountName} — {settings.easypaisaAccountNumber}
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-line p-4 cursor-pointer transition-colors duration-200 hover:border-gold/60 has-[:checked]:border-gold">
                    <input type="radio" name="pm" checked={paymentMethod === "bank"} onChange={() => setPaymentMethod("bank")} className="mt-1" />
                    <div>
                      <p className="font-medium text-sm">Pay Now — Bank Transfer</p>
                      <p className="text-xs text-bronze mt-0.5">
                        {settings.bankName} — {settings.bankAccountTitle} — Account No: {settings.bankAccountNumber}
                      </p>
                    </div>
                  </label>
                </>
              )}

              {paymentMethod !== "cod" && (
                <div className="stagger-fade rounded-xl bg-blush p-4 space-y-3">
                  <p className="text-xs text-ink/70">
                    After sending payment, enter your transaction reference below. Your order will show{" "}
                    <b>Pending Verification</b> until we confirm it.
                  </p>
                  <Field label="Transaction ID / Reference Number">
                    <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="input" />
                  </Field>
                  <Field label="Payment Screenshot (optional)">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setScreenshotName(e.target.files?.[0]?.name ?? null)}
                      className="text-xs"
                    />
                    <p className="text-[11px] text-bronze mt-1">
                      File upload is captured here; connect Supabase Storage (see README) to persist real files.
                    </p>
                  </Field>
                </div>
              )}
            </div>
          </section>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={100}>
        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 h-fit md:sticky md:top-24 transition-shadow duration-300 hover:shadow-goldglow">
          <h2 className="font-display text-xl mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm max-h-56 overflow-y-auto pr-1">
            {items.map((i) => (
              <div key={i.productId} className="flex justify-between">
                <span className="text-ink/80">
                  {i.name} × {i.quantity}
                </span>
                <span>{formatPrice(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-line mt-3 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-bronze">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-bronze">Delivery</span>
              <span>{deliveryCharge === 0 ? "Free" : formatPrice(deliveryCharge)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t border-line">
              <span>Grand Total</span>
              <span key={grandTotal} className="stagger-fade">{formatPrice(grandTotal)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-bronze">Estimated delivery: {siteConfig.shipping.deliveryTimeLabel}</p>

          {serverError && <p className="mt-3 text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={submitting || items.length === 0}
            className="btn-press mt-5 w-full rounded-full bg-gold py-3.5 text-sm font-semibold tracking-wide text-obsidian transition-all hover:scale-[1.02] hover:bg-gold-dark disabled:opacity-50"
          >
            {submitting ? "PLACING ORDER…" : "CONFIRM ORDER"}
          </button>
        </div>
        </ScrollReveal>
      </form>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #e4d9ce;
          border-radius: 0.75rem;
          padding: 0.65rem 0.9rem;
          font-size: 0.875rem;
          background: white;
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }
        .input:focus {
          outline: 2px solid #c9a876;
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  error,
  full,
  children,
}: {
  label: string;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-xs font-medium text-ink/70 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
