"use client";

import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/config";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

export default function WhatsAppFloat() {
  const { settings } = useBusinessSettings();
  return (
    <a
      href={buildWhatsAppLink(undefined, settings.whatsapp)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle size={26} />
    </a>
  );
}
