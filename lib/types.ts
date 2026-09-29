export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export interface Category {
  slug: string;
  name: string;
  megaMenuGroup: "CHARMS" | "BEADS" | "ACCESSORIES" | "TOOLS" | "KITS";
  description: string;
}

export interface Product {
  id: string;
  name: string;
  category: string; // Category slug
  subcategory: string;
  description: string;
  image: string;
  additionalImages: string[];
  price: number;
  originalPrice?: number | null;
  stock: number;
  rating: number;
  reviewCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  featured: boolean;
  bestseller: boolean;
  trending: boolean;
  newArrival: boolean;
  isDemoData?: boolean;
}

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "out-of-stock";
  if (stock <= 5) return "low-stock";
  return "in-stock";
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  text: string;
  date: string;
  verifiedPurchase: boolean;
  isDemoData?: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  stock: number;
}

export type PaymentMethod = "cod" | "easypaisa" | "bank";
export type PaymentStatus = "unpaid-cod" | "pending-verification" | "paid" | "rejected";
export type OrderStatus =
  | "order-placed"
  | "order-confirmed"
  | "processing"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "order-placed",
  "order-confirmed",
  "processing",
  "shipped",
  "out-for-delivery",
  "delivered",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  "order-placed": "Order Placed",
  "order-confirmed": "Order Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  orderId: string;
  customer: {
    fullName: string;
    email: string;
    whatsapp: string;
    phone: string;
  };
  delivery: {
    address: string;
    area: string;
    city: string;
    postalCode: string;
    instructions?: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  paymentScreenshotUrl?: string;
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
  statusHistory: { status: OrderStatus; at: string }[];
}
