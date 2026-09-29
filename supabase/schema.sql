-- KIKICHARMS — SUPABASE / POSTGRES SCHEMA
-- Run this in your Supabase project's SQL editor.
-- Mirrors the shape lib/store/db.ts already expects, so migrating
-- means re-pointing that one file's functions at these tables.

create extension if not exists "uuid-ossp";

create table categories (
  slug text primary key,
  name text not null,
  mega_menu_group text not null check (mega_menu_group in ('CHARMS','BEADS','ACCESSORIES','TOOLS','KITS')),
  description text
);

create table products (
  id text primary key,
  name text not null,
  category text references categories(slug),
  subcategory text not null,
  description text,
  image text,
  additional_images text[] default '{}',
  price numeric(10,2) not null,
  original_price numeric(10,2),
  stock integer not null default 0,
  rating numeric(2,1) default 0,
  review_count integer default 0,
  view_count integer default 0,
  featured boolean default false,
  bestseller boolean default false,
  trending boolean default false,
  new_arrival boolean default false,
  is_demo_data boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table customers (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  email text not null,
  whatsapp text not null,
  phone text not null,
  created_at timestamptz default now()
);

create table orders (
  order_id text primary key,
  customer_id uuid references customers(id),
  full_name text not null,
  email text not null,
  whatsapp text not null,
  phone text not null,
  address text not null,
  area text,
  city text not null,
  postal_code text,
  instructions text,
  subtotal numeric(10,2) not null,
  delivery_charge numeric(10,2) not null,
  grand_total numeric(10,2) not null,
  payment_method text not null check (payment_method in ('cod','easypaisa','bank')),
  payment_status text not null default 'unpaid-cod' check (payment_status in ('unpaid-cod','pending-verification','paid','rejected')),
  payment_reference text,
  payment_screenshot_url text,
  order_status text not null default 'order-placed' check (
    order_status in ('order-placed','order-confirmed','processing','shipped','out-for-delivery','delivered','cancelled')
  ),
  status_history jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id text references orders(order_id) on delete cascade,
  product_id text references products(id),
  name text not null,
  image text,
  unit_price numeric(10,2) not null,
  quantity integer not null,
  subtotal numeric(10,2) not null
);

create table reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id text references products(id),
  customer_name text not null,
  rating integer check (rating between 1 and 5),
  text text,
  verified_purchase boolean default false,
  is_demo_data boolean default false,
  created_at timestamptz default now()
);

create table wishlist (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references customers(id),
  product_id text references products(id),
  created_at timestamptz default now()
);

create table product_views (
  id uuid primary key default uuid_generate_v4(),
  product_id text references products(id),
  viewed_at timestamptz default now()
);

-- Row Level Security: public can read products/categories/reviews,
-- but only the service role (server-side, never the browser) can
-- write orders, update stock, or manage products.
alter table products enable row level security;
alter table categories enable row level security;
alter table reviews enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "Public read products" on products for select using (true);
create policy "Public read categories" on categories for select using (true);
create policy "Public read reviews" on reviews for select using (true);
-- No public policies on orders/order_items: only the service-role key
-- (used in server-side API routes, never exposed to the browser) can
-- read or write them.
