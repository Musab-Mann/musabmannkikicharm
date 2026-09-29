import { notFound } from "next/navigation";
import { siteConfig } from "@/lib/config";
import PageAccent from "@/components/PageAccent";
import ScrollReveal from "@/components/ScrollReveal";

const POLICIES: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: "Privacy Policy",
    body: [
      `${siteConfig.business.name} collects the information you provide at checkout — your name, email, WhatsApp/phone number, and delivery address — solely to process and deliver your order.`,
      "We do not sell your personal information to third parties.",
      
    ],
  },
  terms: {
    title: "Terms & Conditions",
    body: [
      "By placing an order, you agree to provide accurate delivery and contact information.",
      "Prices are shown in PKR and may change without prior notice; the price shown at checkout is final.",
      
    ],
  },
  shipping: {
    title: "Shipping Policy",
    body: [
      `Estimated delivery time is ${siteConfig.shipping.deliveryTimeLabel} from order confirmation.`,
      `A delivery charge of Rs. ${siteConfig.shipping.deliveryCharge} applies unless your order qualifies for free delivery.`,
      
    ],
  },
  returns: {
    title: "Return Policy",
    body: [
      "If an item arrives damaged or incorrect, contact us on WhatsApp within 48 hours of delivery with photos of the item.",
      
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();

  return (
    <div className="relative mx-auto max-w-2xl px-4 sm:px-6 py-10 md:py-16">
      <PageAccent tone="champagne" />
      <div className="relative">
        <ScrollReveal>
          <h1 className="font-display text-3xl sm:text-4xl mb-8">{policy.title}</h1>
        </ScrollReveal>
        <div className="space-y-4 text-ink/80 leading-relaxed text-sm">
          {policy.body.map((p, i) => (
            <ScrollReveal key={i} delay={i * 60}>
              <p>{p}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
