"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X, Plus, Minus, MessageCircle, Phone, Mail } from "lucide-react";
import { categories } from "@/lib/data/categories";
import { products } from "@/lib/data/products";
import { siteConfig, buildWhatsAppLink, buildTelLink } from "@/lib/config";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

/**
 * Mobile accordion — INTERACTION ONLY reference from the provided
 * screenshots (visual design is original). The rule that matters:
 * `openSlug` holds at most ONE category slug at a time. Clicking a
 * category that's already open closes it; clicking a different one
 * swaps `openSlug`, which automatically collapses whatever was open
 * before, because only one value can be "open" at once.
 */
export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const { settings } = useBusinessSettings();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) setOpenSlug(null);
  }, [open]);

  function toggle(slug: string) {
    setOpenSlug((current) => (current === slug ? null : slug));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <div className="drawer-backdrop-in absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="drawer-slide-in absolute inset-y-0 left-0 w-[86%] max-w-sm bg-obsidian text-ivory shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 h-20 border-b border-white/10">
          <span className="font-display text-xl">{siteConfig.business.name}</span>
          <button aria-label="Close menu" onClick={onClose} className="p-2">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Link href="/" onClick={onClose} className="block py-3 text-base border-b border-white/10">
            Home
          </Link>

          {categories.map((cat) => {
            const isOpen = openSlug === cat.slug;
            const subItems = Array.from(new Set(products.filter((p) => p.category === cat.slug).map((p) => p.subcategory)));
            return (
              <div key={cat.slug} className="border-b border-white/10">
                <button
                  onClick={() => toggle(cat.slug)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between py-3 text-base text-left transition-colors hover:text-gold"
                >
                  <span className="uppercase tracking-wide text-sm font-semibold">{cat.name}</span>
                  {isOpen ? <Minus size={16} className="text-gold transition-transform" /> : <Plus size={16} className="text-gold transition-transform" />}
                </button>
                <div className={`accordion-panel ${isOpen ? "open" : ""}`}>
                  <div>
                    <ul className="pb-3 pl-2 space-y-2.5">
                      {subItems.map((sub) => (
                        <li key={sub}>
                          <Link
                            href={`/collections/${cat.slug}?sub=${encodeURIComponent(sub)}`}
                            onClick={onClose}
                            className="text-sm text-ivory/75 hover:text-gold transition-colors"
                          >
                            {sub}
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link
                          href={`/collections/${cat.slug}`}
                          onClick={onClose}
                          className="text-sm text-gold font-medium"
                        >
                          View all →
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}

          <Link href="/about" onClick={onClose} className="block py-3 text-base border-b border-white/10">
            About
          </Link>
          <Link href="/track-order" onClick={onClose} className="block py-3 text-base border-b border-white/10">
            Track Order
          </Link>

          <div className="pt-5 space-y-3">
            <p className="text-[11px] font-mono tracking-[0.2em] text-gold">CONTACT</p>
            <a href={buildWhatsAppLink(undefined, settings.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm">
              <MessageCircle size={16} className="text-gold" /> WhatsApp {settings.whatsapp}
            </a>
            <a href={buildTelLink(settings.phone)} className="flex items-center gap-3 text-sm">
              <Phone size={16} className="text-gold" /> {settings.phone}
            </a>
            <a href={`mailto:${settings.businessEmail}`} className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-gold" /> {settings.businessEmail}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
