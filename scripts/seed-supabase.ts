import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { categories } from "../lib/data/categories";
import { products } from "../lib/data/products";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables in .env.local");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log("Starting Supabase seed...");

  const categoryRows = categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    mega_menu_group: category.megaMenuGroup,
    description: category.description,
  }));

  const { error: categoryError } = await supabase
    .from("categories")
    .upsert(categoryRows, { onConflict: "slug" });

  if (categoryError) {
    throw new Error(`Categories failed: ${categoryError.message}`);
  }

  console.log(`✓ ${categoryRows.length} categories inserted/updated`);

  const productRows = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    subcategory: product.subcategory,
    description: product.description,
    image: product.image,
    additional_images: product.additionalImages,
    price: product.price,
    original_price: product.originalPrice ?? null,
    stock: product.stock,
    rating: 0,
    review_count: 0,
    view_count: product.viewCount,
    featured: product.featured,
    bestseller: product.bestseller,
    trending: product.trending,
    new_arrival: product.newArrival,
    is_demo_data: product.isDemoData ?? true,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  }));

  const { error: productError } = await supabase
    .from("products")
    .upsert(productRows, { onConflict: "id" });

  if (productError) {
    throw new Error(`Products failed: ${productError.message}`);
  }

  console.log(`✓ ${productRows.length} products inserted/updated`);
  console.log("Supabase seed completed!");
}

seed().catch((error) => {
  console.error("SEED ERROR:", error);
  process.exit(1);
});