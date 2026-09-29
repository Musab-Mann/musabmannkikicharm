import { getStockStatus } from "@/lib/types";
import { classNames } from "@/lib/utils";

/** Never relies on color alone — text label always present (accessibility requirement). */
export default function StockBadge({ stock }: { stock: number }) {
  const status = getStockStatus(stock);
  const config = {
    "in-stock": { label: "In Stock", cls: "bg-green-50 text-green-700 border-green-200" },
    "low-stock": { label: `Low Stock — only ${stock} left`, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    "out-of-stock": { label: "Out of Stock", cls: "bg-red-50 text-red-700 border-red-200" },
  }[status];

  return (
    <span className={classNames("inline-block rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide", config.cls)}>
      {config.label}
    </span>
  );
}
