import { buildWhatsAppLink, buildTelLink, siteConfig } from "@/lib/config";
import { getBusinessSettings } from "@/lib/admin/business-settings";
import ScrollReveal from "@/components/ScrollReveal";
import PageAccent from "@/components/PageAccent";

export const metadata = { title: "About — Kikicharms" };

export default async function AboutPage() {
  const settings = await getBusinessSettings();
  return (
    <div>
      <section className="bg-obsidian text-ivory">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 md:py-20 text-center">
          <p className="text-[11px] font-mono tracking-[0.3em] text-gold mb-3">OUR STORY</p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl">Made by hand, made to be worn</h1>
        </div>
      </section>

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 py-10 md:py-16 space-y-12 text-ink/80 leading-relaxed">
        <PageAccent tone="gold" />
        <ScrollReveal>
          <h2 className="font-display text-2xl text-ink mb-3">Where it started</h2>
          <p>
            {siteConfig.business.name} began as a small collection of hand-finished charms and beads,
            built one piece at a time for people who like to design their own jewelry rather than buy
            it off a shelf. What started as a handful of designs has grown into a full range of charms,
            beads, keychains, tools and craft kits.
          </p>
        </ScrollReveal>
        <ScrollReveal>
          <h2 className="font-display text-2xl text-ink mb-3">What we offer</h2>
          <p>
            From delicate pendant charms to bulk strands of glass and crystal beads, precision tools for
            wire work, and boxed kits for beginners — everything is chosen and packed with the same
            attention, whether you&rsquo;re building a single bracelet or stocking up for a project.
          </p>
        </ScrollReveal>
        <ScrollReveal>
          <h2 className="font-display text-2xl text-ink mb-3">Quality &amp; creativity</h2>
          <p>
            Every collection is curated for finish and durability first. We&rsquo;d rather offer fewer,
            better pieces than flood the shelf — and we&rsquo;re always adding new charms and bead styles
            as we find them.
          </p>
        </ScrollReveal>
        <ScrollReveal>
          <h2 className="font-display text-2xl text-ink mb-3">Our mission</h2>
          <p>
            To make handmade jewelry-making accessible — giving you the pieces, tools and kits to create
            something that&rsquo;s genuinely yours.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <div className="rounded-2xl border border-line bg-white p-6">
            <h2 className="font-display text-xl mb-3">Get in touch</h2>
            <div className="space-y-2 text-sm">
              <p><a href={buildWhatsAppLink(undefined, settings.whatsapp)} className="text-gold-dark hover:underline">WhatsApp: {settings.whatsapp}</a></p>
              <p><a href={buildTelLink(settings.phone)} className="text-gold-dark hover:underline">Phone: {settings.phone}</a></p>
              <p><a href={`mailto:${settings.businessEmail}`} className="text-gold-dark hover:underline">{settings.businessEmail}</a></p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
