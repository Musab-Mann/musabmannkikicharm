"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Heart, ShoppingBag, Menu } from "lucide-react";
import MegaMenu from "./MegaMenu";
import MobileMenu from "./MobileMenu";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { siteConfig } from "@/lib/config";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { count } = useCart();
  const { ids } = useWishlist();
  const router = useRouter();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-obsidian text-ivory">
      {/* Mobile header: two-row layout — row 1: hamburger + icons, row 2: brand */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button
            className="p-2 -ml-2"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-1">
            <button
              aria-label="Search"
              onClick={() => setSearchOpen((v) => !v)}
              className="p-2 hover:text-gold hover:scale-110 transition-all"
            >
              <Search size={20} />
            </button>
            <Link href="/wishlist" aria-label="Wishlist" className="relative p-2 hover:text-gold hover:scale-110 transition-all">
              <Heart size={20} />
              {ids.length > 0 && (
                <span key={ids.length} className="badge-pop absolute -top-0.5 -right-0.5 bg-gold text-obsidian text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {ids.length}
                </span>
              )}
            </Link>
            <Link href="/cart" aria-label="Cart" className="relative p-2 hover:text-gold hover:scale-110 transition-all">
              <ShoppingBag size={20} />
              {count > 0 && (
                <span key={count} className="badge-pop absolute -top-0.5 -right-0.5 bg-gold text-obsidian text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
        {/* Brand row — centred, never clipped */}
        <div className="text-center pb-3 px-4">
          <Link href="/" className="inline-block">
            <span className="font-display text-xl tracking-wide">{siteConfig.business.name}</span>
            <span className="block text-[9px] font-sans font-medium tracking-[0.22em] text-gold uppercase mt-0.5 leading-tight whitespace-normal">
              {siteConfig.business.tagline}
            </span>
          </Link>
        </div>
      </div>

      {/* Desktop header — unchanged */}
      <div className="hidden md:flex mx-auto h-20 max-w-7xl items-center justify-between px-8">
        <Link href="/" className="font-display text-2xl tracking-wide">
          {siteConfig.business.name}
          <span className="block text-[10px] font-sans font-medium tracking-[0.3em] text-gold uppercase -mt-1">
            {siteConfig.business.tagline}
          </span>
        </Link>

        <nav className="flex items-center gap-8 font-medium text-sm tracking-wide">
          <Link href="/" className="nav-link hover:text-gold transition-colors">
            Home
          </Link>
          <div
            className="relative"
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <button className="nav-link hover:text-gold transition-colors flex items-center gap-1">
              Collections
            </button>
            {megaOpen && <MegaMenu onClose={() => setMegaOpen(false)} />}
          </div>
          <Link href="/collections" className="nav-link hover:text-gold transition-colors">
            Shop
          </Link>
          <Link href="/about" className="nav-link hover:text-gold transition-colors">
            About
          </Link>
          <Link href="/contact" className="nav-link hover:text-gold transition-colors">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <button
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
            className="p-2 hover:text-gold hover:scale-110 transition-all"
          >
            <Search size={20} />
          </button>
          <Link href="/wishlist" aria-label="Wishlist" className="relative p-2 hover:text-gold hover:scale-110 transition-all">
            <Heart size={20} />
            {ids.length > 0 && (
              <span key={ids.length} className="badge-pop absolute -top-0.5 -right-0.5 bg-gold text-obsidian text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {ids.length}
              </span>
            )}
          </Link>
          <Link href="/cart" aria-label="Cart" className="relative p-2 hover:text-gold hover:scale-110 transition-all">
            <ShoppingBag size={20} />
            {count > 0 && (
              <span key={count} className="badge-pop absolute -top-0.5 -right-0.5 bg-gold text-obsidian text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="search-slide-down border-t border-white/10 bg-obsidian2">
          <form onSubmit={submitSearch} className="mx-auto max-w-3xl px-4 py-4 flex gap-3">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search charms, beads, kits…"
              className="flex-1 bg-transparent border-b border-gold/50 focus:border-gold outline-none py-2 text-ivory placeholder:text-ivory/40 transition-colors"
            />
            <button type="submit" className="btn-press text-gold font-medium text-sm tracking-wide shrink-0">
              Search
            </button>
          </form>
        </div>
      )}

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
