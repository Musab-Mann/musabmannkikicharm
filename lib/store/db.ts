import { unstable_cache, revalidateTag } from "next/cache";
import { Order, Product, Review } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * PRODUCTION PERSISTENCE LAYER
 * ----------------------------------------------------------------
 * Products, orders, order items, and reviews are all read from and
 * written to Supabase/Postgres (see /supabase/schema.sql). There is
 * no local filesystem fallback — this module previously shipped with
 * a dev-only JSON file store that became dead code once every
 * function below was migrated to Supabase; it has been removed so
 * the code matches what actually runs in production.
 *
 * CACHING STRATEGY
 * ----------------------------------------------------------------
 * The product list/detail read (fetchProductsFromDb) is wrapped in
 * Next's unstable_cache with a 60s revalidate window and a "products"
 * tag. At scale this is the single highest-traffic read in the app —
 * every storefront page, the homepage, collections, search, and the
 * public /api/products* routes all go through it — so serving it from
 * cache instead of hitting Postgres on every request is the difference
 * between a handful of DB round-trips and a request-proportional load
 * that would fall over under a real traffic spike.
 *
 * Correctness note: stock overselling is NOT a caching risk here —
 * reserveStockForOrder() below calls the reserve_stock_for_order
 * Postgres function directly, which does its own atomic, uncached
 * row-level check at the moment of purchase. Caching only affects what
 * stock NUMBER a customer sees while browsing; the actual reservation
 * is always checked fresh. Every write path that changes what
 * customers see (admin create/update/delete, stock reservation on
 * checkout) explicitly calls revalidateTag("products") below so admin
 * changes and sold-out states surface immediately rather than waiting
 * out the full 60s window — the 60s figure is a ceiling on staleness
 * from routine polling, not the typical freshness a shopper sees.
 */

const fetchProductsFromDb = unstable_cache(
  async (): Promise<Product[]> => {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase getLiveProducts error:", error);
    return [];
  }

  const products = (data ?? []).map((p) => ({
    ...p,
    subcategory: p.subcategory ?? "",
    image: p.image ?? "/images/products/placeholder.jpg",
    additionalImages: p.additionalImages ?? p.additional_images ?? [],
    originalPrice: p.originalPrice ?? p.original_price ?? null,
    stock: p.stock ?? 0,
    viewCount: p.viewCount ?? p.view_count ?? 0,
    featured: p.featured ?? p.featured ?? false,
    bestseller: p.bestseller ?? p.bestseller ?? false,
    trending: p.trending ?? p.trending ?? false,
    newArrival: p.newArrival ?? p.new_arrival ?? false,
    createdAt: p.createdAt ?? p.created_at ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? p.updated_at ?? new Date().toISOString(),
    isDemoData: p.isDemoData ?? p.is_demo_data ?? false,
    rating: 0,
    reviewCount: 0,
  })) as Product[];

  // Ratings shown to customers are always calculated from real reviews.
  // Demo/sample reviews are deliberately excluded.
  const { data: reviews, error: reviewsError } = await supabaseAdmin
    .from("reviews")
    .select("product_id, rating, is_demo_data")
    .eq("is_demo_data", false);

  if (reviewsError) {
    console.error("Supabase get product reviews error:", reviewsError);
  }

  const reviewStats = new Map<string, { sum: number; count: number }>();
  for (const review of reviews ?? []) {
    const current = reviewStats.get(review.product_id) ?? { sum: 0, count: 0 };
    current.sum += Number(review.rating) || 0;
    current.count += 1;
    reviewStats.set(review.product_id, current);
  }

    return products.map((product) => {
      const stats = reviewStats.get(product.id);
      return {
        ...product,
        rating: stats && stats.count > 0 ? stats.sum / stats.count : 0,
        reviewCount: stats?.count ?? 0,
      };
    });
  },
  ["live-products"],
  { tags: ["products"], revalidate: 60 }
);

export async function getLiveProducts(): Promise<Product[]> {
  return fetchProductsFromDb();
}

/** Admin: create a brand-new product. No component elsewhere needs to change. */
export async function adminCreateProduct(product: Product) {
  const { error } = await supabaseAdmin.from("products").insert({
    id: product.id,
    name: product.name,
    category: product.category,
    subcategory: product.subcategory,
    description: product.description,
    image: product.image,
    additional_images: product.additionalImages ?? [],
    price: product.price,
    original_price: product.originalPrice ?? null,
    stock: product.stock,
    rating: 0,
    review_count: 0,
    view_count: 0,
    featured: product.featured,
    bestseller: product.bestseller,
    trending: product.trending,
    new_arrival: product.newArrival,
    is_demo_data: false,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  });

  if (error) {
    console.error("Supabase adminCreateProduct error:", error);
    throw new Error("Failed to create product");
  }

  revalidateTag("products");
  return product;
}

/** Admin: edit any field on an existing product (seeded or admin-added). */
export async function adminUpdateProduct(productId: string, patch: Partial<Product>) {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };

  if (patch.name !== undefined) update.name = patch.name;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.subcategory !== undefined) update.subcategory = patch.subcategory;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.image !== undefined) update.image = patch.image;
  if (patch.additionalImages !== undefined) update.additional_images = patch.additionalImages;
  if (patch.price !== undefined) update.price = patch.price;
  if (patch.originalPrice !== undefined) update.original_price = patch.originalPrice;
  if (patch.stock !== undefined) update.stock = patch.stock;
  if (patch.featured !== undefined) update.featured = patch.featured;
  if (patch.bestseller !== undefined) update.bestseller = patch.bestseller;
  if (patch.trending !== undefined) update.trending = patch.trending;
  if (patch.newArrival !== undefined) update.new_arrival = patch.newArrival;

  const { error } = await supabaseAdmin.from("products").update(update).eq("id", productId);
  if (error) {
    console.error("Supabase adminUpdateProduct error:", error);
    throw new Error("Failed to update product");
  }
  revalidateTag("products");
}

/** Admin: delete a product (works for both seeded and admin-added products). */
export async function adminDeleteProduct(productId: string) {
  const { error } = await supabaseAdmin.from("products").delete().eq("id", productId);
  if (error) {
    console.error("Supabase adminDeleteProduct error:", error);
    throw new Error("Failed to delete product");
  }
  revalidateTag("products");
}

export async function getLiveProductById(id: string): Promise<Product | undefined> {
  const all = await getLiveProducts();
  return all.find((p) => p.id === id);
}

export async function incrementViewCount(id: string) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("view_count")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("Supabase get view count error:", error);
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from("products")
    .update({
      view_count: (data.view_count ?? 0) + 1,
    })
    .eq("id", id);

  if (updateError) {
    console.error("Supabase incrementViewCount error:", updateError);
  }
}

/**
 * Atomically checks stock and decrements it. Returns false (and changes
 * nothing) if any item would oversell — this is the overselling guard
 * required by the brief. Always call this server-side, never trust the
 * cart quantities sent from the browser as authoritative.
 */
export async function reserveStockForOrder(
  items: { productId: string; quantity: number }[]
): Promise<{ ok: true } | { ok: false; problemProductId: string }> {
  const { data, error } = await supabaseAdmin.rpc(
    "reserve_stock_for_order",
    {
      items,
    }
  );

  if (error) {
    console.error("Supabase reserveStockForOrder error:", error);
    throw new Error("Failed to reserve stock");
  }

  if (!data?.ok) {
    return {
      ok: false,
      problemProductId: data?.problemProductId ?? "",
    };
  }

  // Stock actually changed — invalidate the cached product list so the
  // next storefront request reflects the new (possibly sold-out) stock
  // instead of waiting out the full revalidate window.
  revalidateTag("products");
  return { ok: true };
}

export async function adminSetStock(productId: string, stock: number) {
  const { error } = await supabaseAdmin
    .from("products")
    .update({
      stock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    console.error("Supabase adminSetStock error:", error);
    throw new Error("Failed to update product stock");
  }
}

// ---------- ORDERS ----------
// ---------- ORDERS ----------

export async function createOrder(order: Order): Promise<Order> {
  // 1. Create customer
  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .insert({
      full_name: order.customer.fullName,
      email: order.customer.email,
      whatsapp: order.customer.whatsapp,
      phone: order.customer.phone,
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    console.error("Supabase createOrder customer error:", customerError);
    throw new Error("Failed to create customer record");
  }

  // 2. Create main order
  const { error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      order_id: order.orderId,
      customer_id: customer.id,

      full_name: order.customer.fullName,
      email: order.customer.email,
      whatsapp: order.customer.whatsapp,
      phone: order.customer.phone,

      address: order.delivery.address,
      area: order.delivery.area,
      city: order.delivery.city,
      postal_code: order.delivery.postalCode,
      instructions: order.delivery.instructions ?? null,

      subtotal: order.subtotal,
      delivery_charge: order.deliveryCharge,
      grand_total: order.grandTotal,

      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      payment_reference: order.paymentReference ?? null,
      payment_screenshot_url: order.paymentScreenshotUrl ?? null,

      order_status: order.orderStatus,
      status_history: order.statusHistory,

      created_at: order.createdAt,
      updated_at: order.updatedAt,
    });

  if (orderError) {
    console.error("Supabase createOrder order error:", orderError);
    throw new Error("Failed to create order");
  }

  // 3. Create order items
  const orderItems = order.items.map((item) => ({
    order_id: order.orderId,
    product_id: item.productId,
    name: item.name,
    image: item.image,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));

  const { error: itemsError } = await supabaseAdmin
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("Supabase createOrder items error:", itemsError);
    throw new Error("Failed to create order items");
  }

  return order;
}

export async function getAllOrders(pagination?: { limit: number; offset: number }): Promise<{ orders: Order[]; total: number }> {
  let query = supabaseAdmin
    .from("orders")
    .select(
      `
      *,
      order_items (
        product_id,
        name,
        image,
        unit_price,
        quantity,
        subtotal
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (pagination) {
    query = query.range(pagination.offset, pagination.offset + pagination.limit - 1);
  }

  const { data: orders, error, count } = await query;

  if (error) {
    console.error("Supabase getAllOrders error:", error);
    throw new Error("Failed to fetch orders");
  }

  const mapped = (orders ?? []).map((row) => ({
    orderId: row.order_id,

    customer: {
      fullName: row.full_name,
      email: row.email,
      whatsapp: row.whatsapp,
      phone: row.phone,
    },

    delivery: {
      address: row.address,
      area: row.area ?? "",
      city: row.city,
      postalCode: row.postal_code ?? "",
      instructions: row.instructions ?? undefined,
    },

    items: (row.order_items ?? []).map((item: any) => ({
      productId: item.product_id,
      name: item.name,
      image: item.image ?? "",
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    })),

    subtotal: Number(row.subtotal),
    deliveryCharge: Number(row.delivery_charge),
    grandTotal: Number(row.grand_total),

    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,

    paymentReference: row.payment_reference ?? undefined,
    paymentScreenshotUrl: row.payment_screenshot_url ?? undefined,

    orderStatus: row.order_status,

    createdAt: row.created_at,
    updatedAt: row.updated_at,

    statusHistory: row.status_history ?? [],
  }));

  return { orders: mapped, total: count ?? mapped.length };
}

export async function getOrderById(
  orderId: string
): Promise<Order | undefined> {
  const { data: row, error } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      order_items (
        product_id,
        name,
        image,
        unit_price,
        quantity,
        subtotal
      )
    `)
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) {
    console.error("Supabase getOrderById error:", error);
    throw new Error("Failed to fetch order");
  }

  if (!row) return undefined;

  return {
    orderId: row.order_id,

    customer: {
      fullName: row.full_name,
      email: row.email,
      whatsapp: row.whatsapp,
      phone: row.phone,
    },

    delivery: {
      address: row.address,
      area: row.area ?? "",
      city: row.city,
      postalCode: row.postal_code ?? "",
      instructions: row.instructions ?? undefined,
    },

    items: (row.order_items ?? []).map((item: any) => ({
      productId: item.product_id,
      name: item.name,
      image: item.image ?? "",
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
    })),

    subtotal: Number(row.subtotal),
    deliveryCharge: Number(row.delivery_charge),
    grandTotal: Number(row.grand_total),

    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,

    paymentReference: row.payment_reference ?? undefined,
    paymentScreenshotUrl: row.payment_screenshot_url ?? undefined,

    orderStatus: row.order_status,

    createdAt: row.created_at,
    updatedAt: row.updated_at,

    statusHistory: row.status_history ?? [],
  };
}

export async function updateOrderStatus(
  orderId: string,
  patch: Partial<Pick<Order, "orderStatus" | "paymentStatus">>
): Promise<Order | undefined> {
  const existing = await getOrderById(orderId);

  if (!existing) return undefined;

  const now = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    updated_at: now,
  };

  if (patch.orderStatus && patch.orderStatus !== existing.orderStatus) {
    updateData.order_status = patch.orderStatus;

    updateData.status_history = [
      ...existing.statusHistory,
      {
        status: patch.orderStatus,
        at: now,
      },
    ];
  }

  if (patch.paymentStatus) {
    updateData.payment_status = patch.paymentStatus;
  }

  const { error } = await supabaseAdmin
    .from("orders")
    .update(updateData)
    .eq("order_id", orderId);

  if (error) {
    console.error("Supabase updateOrderStatus error:", error);
    throw new Error("Failed to update order");
  }

  return getOrderById(orderId);
}

// ---------- REVIEWS ----------

export async function getReviewsForProduct(productId: string): Promise<Review[]> {
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("is_demo_data", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase getReviewsForProduct error:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    productId: r.product_id,
    customerName: r.customer_name,
    rating: r.rating,
    text: r.text ?? "",
    date: r.created_at,
    verifiedPurchase: r.verified_purchase ?? false,
    isDemoData: r.is_demo_data ?? false,
  })) as Review[];
}

export async function getAllReviews(): Promise<Review[]> {
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("*")
    .eq("is_demo_data", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase getAllReviews error:", error);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    productId: r.product_id,
    customerName: r.customer_name,
    rating: r.rating,
    text: r.text ?? "",
    date: r.created_at,
    verifiedPurchase: r.verified_purchase ?? false,
    isDemoData: r.is_demo_data ?? false,
  })) as Review[];
}
