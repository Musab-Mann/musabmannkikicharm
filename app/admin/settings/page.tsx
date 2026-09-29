"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

interface BusinessSettings {
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

function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-bronze mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-gold-dark"
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/business-settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  function set<K extends keyof BusinessSettings>(key: K, value: string) {
    setSettings((s) => (s ? { ...s, [key]: key === "deliveryCharge" || key === "freeDeliveryThreshold" ? Number(value) : value } : s));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/business-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setMsg({ type: "error", text: data.error || "Could not save settings." });
      return;
    }
    setMsg({ type: "ok", text: "Saved. The website and checkout now use these values immediately — no deployment needed." });
  }

  if (!settings) return <p className="text-sm text-bronze py-8">Loading…</p>;

  return (
    <div className="max-w-3xl pb-16">
      <h1 className="font-display text-2xl mb-1">Business Settings</h1>
      <p className="text-sm text-bronze mb-6">
        These values drive the live website (checkout payment details, delivery charges) — changing them here does
        not require a code deployment.
      </p>

      {msg && (
        <div className={`mb-6 rounded-lg px-4 py-3 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-5 mb-6">
        <p className="font-medium mb-4">Contact</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business email" value={settings.businessEmail} onChange={(v) => set("businessEmail", v)} />
          <Field label="Phone" value={settings.phone} onChange={(v) => set("phone", v)} />
          <Field label="WhatsApp" value={settings.whatsapp} onChange={(v) => set("whatsapp", v)} />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 mb-6">
        <p className="font-medium mb-4">Easypaisa</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account name" value={settings.easypaisaAccountName} onChange={(v) => set("easypaisaAccountName", v)} />
          <Field label="Account number" value={settings.easypaisaAccountNumber} onChange={(v) => set("easypaisaAccountNumber", v)} />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 mb-6">
        <p className="font-medium mb-4">JazzCash</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account name" value={settings.jazzcashAccountName} onChange={(v) => set("jazzcashAccountName", v)} />
          <Field label="Account number" value={settings.jazzcashAccountNumber} onChange={(v) => set("jazzcashAccountNumber", v)} />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 mb-6">
        <p className="font-medium mb-4">Bank transfer</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank name" value={settings.bankName} onChange={(v) => set("bankName", v)} />
          <Field label="Account title" value={settings.bankAccountTitle} onChange={(v) => set("bankAccountTitle", v)} />
          <Field label="Account number" value={settings.bankAccountNumber} onChange={(v) => set("bankAccountNumber", v)} />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 mb-6">
        <p className="font-medium mb-4">Delivery</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Delivery charge (PKR)" type="number" value={settings.deliveryCharge} onChange={(v) => set("deliveryCharge", v)} />
          <Field label="Free delivery threshold (PKR)" type="number" value={settings.freeDeliveryThreshold ?? 0} onChange={(v) => set("freeDeliveryThreshold", v)} />
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 rounded-full bg-obsidian px-5 py-2.5 text-sm font-medium text-ivory disabled:opacity-50"
      >
        <Save size={14} /> {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
