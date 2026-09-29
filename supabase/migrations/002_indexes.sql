-- ============================================================================
-- KKCHARM — INDEXES FOR SCALABILITY (Phase 7)
-- Run after 001_phase1_phase2_phase3.sql. Idempotent (IF NOT EXISTS).
--
-- These target the actual query patterns in lib/store/db.ts and the API
-- routes — not a generic "index everything" pass. Each one is tied to a
-- real WHERE/ORDER BY/JOIN in the codebase:
-- ============================================================================

-- Collection/category pages filter products by category (app/collections/[slug]).
create index if not exists idx_products_category on products(category);

-- Homepage sections filter on these boolean flags (Featured/Bestseller/etc.)
create index if not exists idx_products_featured on products(featured) where featured = true;
create index if not exists idx_products_bestseller on products(bestseller) where bestseller = true;
create index if not exists idx_products_trending on products(trending) where trending = true;
create index if not exists idx_products_new_arrival on products(new_arrival) where new_arrival = true;

-- getAllOrders() always orders by created_at desc, and the admin dashboard
-- filters by order_status.
create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_orders_status on orders(order_status);
create index if not exists idx_orders_customer on orders(customer_id);

-- order_items is joined to orders on every getAllOrders()/getOrderById()
-- call — this FK had no index, which is the single most expensive missing
-- index in the schema as order volume grows.
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_order_items_product_id on order_items(product_id);

-- getReviewsForProduct() filters by product_id on every product page view.
create index if not exists idx_reviews_product_id on reviews(product_id);

create index if not exists idx_wishlist_customer on wishlist(customer_id);
create index if not exists idx_product_views_product on product_views(product_id);
