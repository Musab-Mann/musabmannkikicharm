export function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function generateOrderId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${year}-${rand}`;
}

export function classNames(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Accepts Pakistani-style numbers loosely: 03XXXXXXXXX or +923XXXXXXXXX */
export function isValidPKPhone(phone: string) {
  const cleaned = phone.replace(/[\s-]/g, "");
  return /^(\+92|0)?3\d{9}$/.test(cleaned);
}
