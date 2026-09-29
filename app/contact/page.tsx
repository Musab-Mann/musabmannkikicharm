"use client";

import { useState } from "react";
import { buildWhatsAppLink, buildTelLink } from "@/lib/config";
import { isValidEmail } from "@/lib/utils";
import PageAccent from "@/components/PageAccent";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const { settings } = useBusinessSettings();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !isValidEmail(form.email) || !form.message.trim()) {
      setError("Please fill in your name, a valid email, and a message.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: "contact" }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="relative mx-auto max-w-3xl px-4 sm:px-6 py-10 md:py-16">
      <PageAccent tone="rose" />
      <h1 className="font-display text-3xl sm:text-4xl mb-2">Contact Us</h1>
      <p className="text-bronze mb-10">We usually reply fastest on WhatsApp.</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        <a href={buildWhatsAppLink(undefined, settings.whatsapp)} className="rounded-2xl border border-line bg-white p-5 text-center transition-all duration-300 hover:shadow-goldglow hover:-translate-y-1">
          <p className="font-medium text-sm">WhatsApp</p>
          <p className="text-xs text-bronze mt-1">{settings.whatsapp}</p>
        </a>
        <a href={buildTelLink(settings.phone)} className="rounded-2xl border border-line bg-white p-5 text-center transition-all duration-300 hover:shadow-goldglow hover:-translate-y-1">
          <p className="font-medium text-sm">Phone</p>
          <p className="text-xs text-bronze mt-1">{settings.phone}</p>
        </a>
        <a href={`mailto:${settings.businessEmail}`} className="rounded-2xl border border-line bg-white p-5 text-center transition-all duration-300 hover:shadow-goldglow hover:-translate-y-1">
          <p className="font-medium text-sm">Email</p>
          <p className="text-xs text-bronze mt-1">{settings.businessEmail}</p>
        </a>
      </div>

      {status === "sent" ? (
        <div className="rounded-2xl bg-blush p-6 text-center">
          <p className="font-display text-xl">Message sent ✨</p>
          <p className="text-sm text-bronze mt-1">We&rsquo;ll get back to you soon.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-white p-6">
          <input
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-xl border border-line px-4 py-2.5 text-sm"
          />
          <input
            placeholder="Your email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-xl border border-line px-4 py-2.5 text-sm"
          />
          <textarea
            placeholder="Message"
            rows={4}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            className="w-full rounded-xl border border-line px-4 py-2.5 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {status === "error" && <p className="text-sm text-red-600">Something went wrong — try WhatsApp instead.</p>}
          <button
            type="submit"
            disabled={status === "sending"}
            className="btn-press rounded-full bg-gold px-6 py-3 text-sm font-semibold text-obsidian transition-colors hover:bg-gold-dark disabled:opacity-50"
          >
            {status === "sending" ? "SENDING…" : "SEND MESSAGE"}
          </button>
        </form>
      )}
    </div>
  );
}
