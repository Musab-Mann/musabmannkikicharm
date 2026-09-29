import { Product } from "@/lib/types";

/**
 * PRODUCT CATALOG — DEMO/SEED DATA
 * ----------------------------------------------------------------
 * These are the real product/subcategory NAMES from the business
 * owner's brief. Prices, stock, ratings and images are clearly
 * marked sample data (isDemoData: true) and are meant to be edited
 * from /admin/products (or directly here) before launch.
 *
 * To add a new product: add one object to this array. No component
 * anywhere else needs to change — cards, grids, filters, search and
 * the admin dashboard all read from this single list.
 */

let counter = 0;
const id = () => `LA-${String(++counter).padStart(4, "0")}`;
const now = new Date().toISOString();

type Seed = Omit<
  Product,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "viewCount"
  | "rating"
  | "reviewCount"
  | "additionalImages"
  | "isDemoData"
> & { viewCount?: number; rating?: number; reviewCount?: number };

function make(seed: Seed): Product {
  return {
    ...seed,
    id: id(),
    createdAt: now,
    updatedAt: now,
    image: "",
    additionalImages: [],
    viewCount: seed.viewCount ?? Math.floor(200 + Math.random() * 2200),
    rating: seed.rating ?? 0,
    reviewCount: seed.reviewCount ?? 0,
    isDemoData: true,
  };
}
// Default/local product images are disabled. Images must be uploaded from the Admin Dashboard.
const img = (_slug: string) => "";

export const products: Product[] = [
  // ---------------- CHARMS ----------------
  make({ name: "Kitty Charm", category: "charms", subcategory: "Kitty Charm", description: "A sweet hand-finished kitty charm, perfect for bracelets and bag charms.", image: img("kitty-charm"), price: 350, stock: 18, featured: true, bestseller: true, trending: false, newArrival: false }),
  make({ name: "Starfish Pendant Charm", category: "charms", subcategory: "Starfish Pendant Charm", description: "Ocean-inspired starfish pendant with a soft brushed finish.", image: img("starfish-pendant-charm"), price: 380, originalPrice: 450, stock: 12, featured: false, bestseller: false, trending: true, newArrival: false }),
  make({ name: "Heart & Butterfly Pendant", category: "charms", subcategory: "Heart & Butterfly Pendant", description: "A romantic pairing of heart and butterfly motifs on one pendant.", image: img("heart-butterfly-pendant"), price: 420, stock: 9, featured: true, bestseller: false, trending: false, newArrival: true }),
  make({ name: "Strawberry Garden Square Charm", category: "charms", subcategory: "Strawberry Garden Square Charm", description: "A playful square charm featuring a strawberry garden scene.", image: img("strawberry-garden-square-charm"), price: 390, stock: 6, featured: false, bestseller: false, trending: false, newArrival: true }),
  make({ name: "Panda Bambo", category: "charms", subcategory: "Panda Bambo", description: "Panda-with-bamboo charm, hand-detailed for a cute finish.", image: img("panda-bambo"), price: 360, stock: 0, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Flower Charm", category: "charms", subcategory: "Flower Charm", description: "A classic blossom charm that pairs with almost any design.", image: img("flower-charm"), price: 300, stock: 24, featured: true, bestseller: true, trending: false, newArrival: false }),
  make({ name: "Rainbow Charm", category: "charms", subcategory: "Rainbow Charm", description: "A cheerful enamel rainbow charm.", image: img("rainbow-charm"), price: 330, stock: 15, featured: false, bestseller: false, trending: true, newArrival: false }),
  make({ name: "Bow Charm", category: "charms", subcategory: "Bow Charm", description: "A delicate bow charm with a satin-polish finish.", image: img("bow-charm"), price: 310, stock: 20, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Character Charm", category: "charms", subcategory: "Character Charm", description: "A collectible character charm — great for gifting.", image: img("character-charm"), price: 400, originalPrice: 480, stock: 4, featured: false, bestseller: false, trending: true, newArrival: false }),
  make({ name: "Letter Charm", category: "charms", subcategory: "Letter Charm", description: "Personalize any piece with an individual letter charm.", image: img("letter-charm"), price: 250, stock: 40, featured: true, bestseller: true, trending: false, newArrival: false }),

  // ---------------- STAINLESS STEEL ----------------
  make({ name: "Permanent Bracelet", category: "stainless-steel", subcategory: "Permanent Bracelet", description: "A welded-to-fit permanent bracelet in premium stainless steel.", image: img("permanent-bracelet"), price: 1200, stock: 10, featured: true, bestseller: true, trending: true, newArrival: false }),
  make({ name: "Gold Stainless Steel Chain", category: "stainless-steel", subcategory: "Gold", description: "Tarnish-resistant gold-toned stainless steel chain.", image: img("gold-stainless-chain"), price: 950, stock: 14, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Silver Stainless Steel Chain", category: "stainless-steel", subcategory: "Silver", description: "Tarnish-resistant silver-toned stainless steel chain.", image: img("silver-stainless-chain"), price: 900, stock: 3, featured: false, bestseller: false, trending: false, newArrival: false }),

  // ---------------- TOOLS ----------------
  make({ name: "Cutter Plier", category: "tools", subcategory: "Cutter Plier", description: "Precision wire cutter plier for clean, flush cuts.", image: img("cutter-plier"), price: 550, stock: 22, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Round Nose Plier", category: "tools", subcategory: "Round Nose Plier", description: "Round nose plier for forming loops and curves.", image: img("round-nose-plier"), price: 520, stock: 17, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "3x Wire Looping Plier Set", category: "tools", subcategory: "3x Wire Looping Plier", description: "A set of three wire looping pliers for consistent loop sizes.", image: img("wire-looping-plier-set"), price: 1350, originalPrice: 1550, stock: 8, featured: true, bestseller: false, trending: false, newArrival: true }),

  // ---------------- KEYCHAINS & TABLE CHARMS ----------------
  make({ name: "Keychain", category: "keychains-table-charms", subcategory: "Keychains", description: "A durable everyday-carry keychain with a decorative charm.", image: img("keychain"), price: 380, stock: 30, featured: true, bestseller: true, trending: false, newArrival: false }),
  make({ name: "Table Charm", category: "keychains-table-charms", subcategory: "Table Charms", description: "A small decorative table charm / display piece.", image: img("table-charm"), price: 420, stock: 11, featured: false, bestseller: false, trending: false, newArrival: false }),

  // ---------------- GLASS & MARBLE BEADS ----------------
  make({ name: "Shiny Beads 8mm", category: "glass-marble-beads", subcategory: "Shiny Beads 8mm", description: "High-shine 8mm glass beads, sold per strand.", image: img("shiny-beads-8mm"), price: 220, stock: 45, featured: false, bestseller: true, trending: false, newArrival: false }),
  make({ name: "Marble Beads 8mm", category: "glass-marble-beads", subcategory: "Marble Beads 8mm", description: "8mm marbled glass beads with soft swirl patterns.", image: img("marble-beads-8mm"), price: 240, stock: 30, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Double Shade Shiny Beads", category: "glass-marble-beads", subcategory: "Double Shade Shiny", description: "Two-tone shiny beads for dimensional designs.", image: img("double-shade-shiny"), price: 260, stock: 5, featured: false, bestseller: false, trending: true, newArrival: false }),
  make({ name: "Golden Kanchao Beads", category: "glass-marble-beads", subcategory: "Golden Kanchao", description: "Golden kanchao-style glass beads with a warm shimmer.", image: img("golden-kanchao"), price: 280, stock: 19, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Glass Texture Beads 8mm", category: "glass-marble-beads", subcategory: "Glass Texture 8mm", description: "Textured 8mm glass beads for a matte, tactile finish.", image: img("glass-texture-8mm"), price: 230, stock: 27, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Czech Beads 10mm", category: "glass-marble-beads", subcategory: "Czech 10mm", description: "Premium 10mm Czech glass beads.", image: img("czech-10mm"), price: 340, originalPrice: 390, stock: 13, featured: true, bestseller: false, trending: false, newArrival: true }),

  // ---------------- TRENDY ARTICLES ----------------
  make({ name: "Lily Flower Accent", category: "trendy-articles", subcategory: "Lily Flowers", description: "A trendy lily flower accent piece for custom jewelry.", image: img("lily-flowers"), price: 200, stock: 21, featured: false, bestseller: false, trending: true, newArrival: false }),
  make({ name: "Tulip Flower Accent", category: "trendy-articles", subcategory: "Tulip Flowers", description: "A tulip-shaped flower accent for delicate designs.", image: img("tulip-flowers"), price: 200, stock: 16, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Floral Accent Piece", category: "trendy-articles", subcategory: "Floral", description: "A mixed floral accent piece.", image: img("floral"), price: 210, stock: 0, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Green Leaf Accent (Medium/Small)", category: "trendy-articles", subcategory: "Green Leaf Medium/Small", description: "Green leaf accents in medium and small sizing.", image: img("green-leaf"), price: 180, stock: 33, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Pearl Bow / Flower Accent", category: "trendy-articles", subcategory: "Pearl Bow / Flower", description: "A pearl-finished bow and flower accent piece.", image: img("pearl-bow-flower"), price: 260, stock: 14, featured: true, bestseller: false, trending: true, newArrival: false }),
  make({ name: "Pearl Star / Heart Accent", category: "trendy-articles", subcategory: "Pearl Star / Heart", description: "A pearl-finished star and heart accent piece.", image: img("pearl-star-heart"), price: 260, stock: 10, featured: false, bestseller: false, trending: false, newArrival: true }),

  // ---------------- LOREAL BEADS ----------------
  make({ name: "Ready Made Clover", category: "loreal-beads", subcategory: "Ready Made Clover", description: "Pre-assembled clover bead piece, ready to use.", image: img("ready-made-clover"), price: 150, stock: 38, featured: false, bestseller: true, trending: false, newArrival: false }),
  make({ name: "Loreal Beads 4mm", category: "loreal-beads", subcategory: "Loreal 4mm", description: "4mm loreal-style beads, sold per strand.", image: img("loreal-4mm"), price: 170, stock: 25, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Loreal Beads 6mm", category: "loreal-beads", subcategory: "Loreal 6mm", description: "6mm loreal-style beads, sold per strand.", image: img("loreal-6mm"), price: 190, stock: 20, featured: false, bestseller: false, trending: false, newArrival: false }),

  // ---------------- CRYSTAL BEADS ----------------
  make({ name: "Crystal Beads 4mm", category: "crystal-beads", subcategory: "4mm Beads", description: "Faceted 4mm crystal beads.", image: img("crystal-4mm"), price: 210, stock: 29, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Crystal Beads 6mm", category: "crystal-beads", subcategory: "6mm Beads", description: "Faceted 6mm crystal beads.", image: img("crystal-6mm"), price: 240, stock: 22, featured: true, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Crystal Beads 8mm", category: "crystal-beads", subcategory: "8mm Beads", description: "Faceted 8mm crystal beads.", image: img("crystal-8mm"), price: 270, stock: 7, featured: false, bestseller: false, trending: true, newArrival: false }),
  make({ name: "Opaque Matte Beads 3mm", category: "crystal-beads", subcategory: "3mm Opaque Matte", description: "Matte-finish opaque beads, 3mm.", image: img("opaque-matte-3mm"), price: 160, stock: 31, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Crystal Beads 4mm — Alt Finish", category: "crystal-beads", subcategory: "4mm variant", description: "An alternate finish of the 4mm crystal bead line. Name editable from admin.", image: img("crystal-4mm-variant"), price: 220, stock: 18, featured: false, bestseller: false, trending: false, newArrival: true }),

  // ---------------- BOX KIT ----------------
  make({ name: "Bicone Crystal Kit 4mm", category: "box-kit", subcategory: "Bicone Crystal Kit 4mm", description: "A complete kit of 4mm bicone crystal beads in assorted shades.", image: img("bicone-crystal-kit-4mm"), price: 850, originalPrice: 999, stock: 9, featured: true, bestseller: true, trending: false, newArrival: false }),
  make({ name: "Clay Beads Kit", category: "box-kit", subcategory: "Clay Beads Kit", description: "A boxed set of polymer clay beads in curated colorways.", image: img("clay-beads-kit"), price: 780, stock: 12, featured: false, bestseller: false, trending: true, newArrival: false }),
  make({ name: "Seed Beads Kit 2mm", category: "box-kit", subcategory: "Seed Beads Kit 2mm", description: "A boxed set of 2mm seed beads for fine detail work.", image: img("seed-beads-kit-2mm"), price: 650, stock: 16, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Seed Beads 1mm (Shine)", category: "box-kit", subcategory: "1mm Seed Beads (Shine)", description: "1mm high-shine seed beads, boxed.", image: img("seed-beads-1mm-shine"), price: 600, stock: 2, featured: false, bestseller: false, trending: false, newArrival: false }),
  make({ name: "Seed Beads 1mm (Matte)", category: "box-kit", subcategory: "1mm Seed Beads (Matte)", description: "1mm matte-finish seed beads, boxed.", image: img("seed-beads-1mm-matte"), price: 600, stock: 20, featured: false, bestseller: false, trending: false, newArrival: false }),
];

export function getProductById(id: string) {
  return products.find((p) => p.id === id);
}

export function getProductsByCategory(categorySlug: string) {
  return products.filter((p) => p.category === categorySlug);
}
