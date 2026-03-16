"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/quotations", label: "Quotations" },
  { href: "/projects", label: "Projects" },
  { href: "/ledger", label: "Ledger" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950/70">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-800">
        <div className="h-8 w-8 rounded bg-emerald-500" />
        <span className="text-lg font-semibold tracking-tight">CinePanda</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

