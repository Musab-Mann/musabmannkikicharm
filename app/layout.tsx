import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import AmbientBackground from "@/components/AmbientBackground";
import PageTransition from "@/components/PageTransition";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: `${siteConfig.business.name} — ${siteConfig.business.tagline}`,
  description:
    "Handmade jewelry, charms, beads, keychains and craft supplies. Browse collections, shop online, and track your order.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>

      <body className="font-sans text-ink">
        <AmbientBackground />
        <CartProvider>
          <WishlistProvider>
            <div className="ambient-content-layer">
              <Navbar />
              <main className="min-h-screen">
                <PageTransition>{children}</PageTransition>
              </main>
              <Footer />
              <WhatsAppFloat />
            </div>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}