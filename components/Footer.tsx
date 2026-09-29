import Link from "next/link";
import { categories } from "@/lib/data/categories";
import { siteConfig, buildWhatsAppLink, buildTelLink } from "@/lib/config";
import { getBusinessSettings } from "@/lib/admin/business-settings";

// Server component, so the live admin-edited contact numbers can be read
// directly from the DB at render time — no client fetch/loading flash.
export default async function Footer() {
  const settings = await getBusinessSettings();
  return (
    <footer className="bg-obsidian text-ivory/80 mt-16 md:mt-24">
      <div className="mx-auto max-w-7xl px-5 py-12 md:py-16 grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-5 md:gap-10">
        <div className="col-span-2">
          <p className="font-display text-2xl text-ivory">{siteConfig.business.name}</p>
          <p className="mt-3 text-sm max-w-xs leading-relaxed">
            Handmade jewelry, charms, beads and craft supplies — made and packed with care.
          </p>
          <div className="mt-5 flex gap-4 text-xs tracking-wide">
            <a href={siteConfig.social.instagram} className="hover:text-gold">Instagram</a>
            <a href={siteConfig.social.tiktok} className="hover:text-gold">TikTok</a>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-mono tracking-[0.2em] text-gold mb-4">QUICK LINKS</p>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/" className="hover:text-gold">Home</Link></li>
            <li><Link href="/collections" className="hover:text-gold">Shop</Link></li>
            <li><Link href="/collections" className="hover:text-gold">Collections</Link></li>
            <li><Link href="/about" className="hover:text-gold">About</Link></li>
            <li><Link href="/contact" className="hover:text-gold">Contact</Link></li>
            <li><Link href="/track-order" className="hover:text-gold">Track Order</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-mono tracking-[0.2em] text-gold mb-4">COLLECTIONS</p>
          <ul className="space-y-2.5 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={`/collections/${c.slug}`} className="hover:text-gold">
                  {c.name.replace(" Collection", "")}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <p className="text-[11px] font-mono tracking-[0.2em] text-gold mb-4">SUPPORT</p>
          <ul className="space-y-2.5 text-sm">
            <li><a href={buildWhatsAppLink(undefined, settings.whatsapp)} className="hover:text-gold break-all">WhatsApp {settings.whatsapp}</a></li>
            <li><a href={buildTelLink(settings.phone)} className="hover:text-gold">{settings.phone}</a></li>
            <li><a href={`mailto:${settings.businessEmail}`} className="hover:text-gold break-all">{settings.businessEmail}</a></li>
            <li><Link href="/policies/privacy" className="hover:text-gold">Privacy Policy</Link></li>
            <li><Link href="/policies/terms" className="hover:text-gold">Terms &amp; Conditions</Link></li>
            <li><Link href="/policies/shipping" className="hover:text-gold">Shipping Policy</Link></li>
            <li><Link href="/policies/returns" className="hover:text-gold">Return Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-ivory/50 px-4">
        © {new Date().getFullYear()} {siteConfig.business.name}. All rights reserved.
      </div>
    </footer>
  );
}
