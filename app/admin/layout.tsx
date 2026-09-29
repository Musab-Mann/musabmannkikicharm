"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { classNames } from "@/lib/utils";
import { LayoutDashboard, Package, ClipboardList, Wallet, ShieldCheck, Activity, Settings, LogOut, Menu, X } from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/settings", label: "Business Settings", icon: Settings },
  { href: "/admin/security", label: "Security", icon: ShieldCheck },
  { href: "/admin/control-panel", label: "Control Panel", icon: Activity },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === "/admin/login" || pathname === "/admin/forgot-password") return <>{children}</>;

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  const NavLinks = () => (
    <>
      {links.map((l) => {
        const Icon = l.icon;
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setSidebarOpen(false)}
            className={classNames(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-obsidian text-ivory" : "text-ink/70 hover:bg-blush"
            )}
          >
            <Icon size={16} /> {l.label}
          </Link>
        );
      })}
      <button
        onClick={logout}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink/70 hover:bg-blush"
      >
        <LogOut size={16} /> Log out
      </button>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-line bg-white sticky top-0 z-40">
        <p className="font-display text-lg">Admin</p>
        <button
          aria-label="Open admin menu"
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-blush"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 bg-white h-full shadow-xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <p className="font-display text-xl">Admin</p>
              <button
                aria-label="Close menu"
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-blush"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-1">
              <NavLinks />
            </nav>
          </aside>
        </div>
      )}

      {/* Desktop layout */}
      <div className="md:mx-auto md:flex md:max-w-7xl md:gap-8 md:px-6 md:py-10">
        <aside className="hidden md:block w-56 shrink-0">
          <p className="font-display text-xl mb-6">Admin</p>
          <nav className="space-y-1">
            <NavLinks />
          </nav>
        </aside>
        <div className="flex-1 min-w-0 px-4 py-6 md:px-0 md:py-0">
          {children}
        </div>
      </div>
    </>
  );
}
