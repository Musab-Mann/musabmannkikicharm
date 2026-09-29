import Link from "next/link";
import { categories, megaMenuGroups } from "@/lib/data/categories";

export default function MegaMenu({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute left-1/2 top-full z-50 w-[min(90vw,900px)] -translate-x-1/2 rounded-b-2xl border-t border-gold/20 bg-obsidian2 p-8 shadow-2xl animate-fadeUp"
      onClick={onClose}
    >
      <div className="grid grid-cols-5 gap-8">
        {megaMenuGroups.map((group) => {
          const cats = categories.filter((c) => c.megaMenuGroup === group);
          if (cats.length === 0) return null;
          return (
            <div key={group}>
              <p className="text-[11px] font-mono tracking-[0.2em] text-gold mb-4">{group}</p>
              <ul className="space-y-3">
                {cats.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/collections/${c.slug}`}
                      className="text-sm text-ivory/85 hover:text-gold transition-colors"
                    >
                      {c.name.replace(" Collection", "")}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="mt-6 border-t border-white/10 pt-4">
        <Link href="/collections" className="text-xs tracking-widest text-gold font-medium">
          VIEW ALL COLLECTIONS →
        </Link>
      </div>
    </div>
  );
}
