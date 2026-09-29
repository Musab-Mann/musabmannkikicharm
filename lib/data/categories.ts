import { Category } from "@/lib/types";

/**
 * These are the ACTUAL business collections as provided.
 * Editing a category here automatically updates:
 * navigation, mega-menu, mobile accordion, and collection pages.
 * No other file needs to change.
 */
export const categories: Category[] = [
  {
    slug: "charms",
    name: "Charms Collection",
    megaMenuGroup: "CHARMS",
    description:
      "Delicate hand-finished charms — from playful characters to timeless florals.",
  },
  {
    slug: "stainless-steel",
    name: "Stainless Steel Collection",
    megaMenuGroup: "ACCESSORIES",
    description:
      "Permanent bracelets and stainless steel pieces in gold and silver finishes.",
  },
  {
    slug: "tools",
    name: "Tools Collection",
    megaMenuGroup: "TOOLS",
    description: "Precision pliers and tools for jewelry making and repair.",
  },
  {
    slug: "keychains-table-charms",
    name: "Keychains & Table Charms",
    megaMenuGroup: "ACCESSORIES",
    description: "Everyday carry charms and decorative table pieces.",
  },
  {
    slug: "glass-marble-beads",
    name: "Glass & Marble Beads",
    megaMenuGroup: "BEADS",
    description: "Shiny, marbled and textured glass beads for custom designs.",
  },
  {
    slug: "trendy-articles",
    name: "Trendy Articles",
    megaMenuGroup: "CHARMS",
    description: "Seasonal florals, leaves, pearls and statement accents.",
  },
  {
    slug: "loreal-beads",
    name: "Loreal Beads",
    megaMenuGroup: "BEADS",
    description: "Loreal-style beads and ready-made clover pieces.",
  },
  {
    slug: "crystal-beads",
    name: "Crystal Beads",
    megaMenuGroup: "BEADS",
    description: "Faceted crystal beads in a full range of sizes and finishes.",
  },
  {
    slug: "box-kit",
    name: "Box Kit",
    megaMenuGroup: "KITS",
    description: "Complete craft kits bundling beads, tools and materials.",
  },
];

export function getCategoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export const megaMenuGroups = ["CHARMS", "BEADS", "ACCESSORIES", "TOOLS", "KITS"] as const;
