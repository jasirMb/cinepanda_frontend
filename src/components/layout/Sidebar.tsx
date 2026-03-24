"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/products", label: "Products" },
  { href: "/quotations", label: "Quotations" },
  { href: "/projects", label: "Projects" },
  { href: "/ledger", label: "Ledger" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <Image
          src="/cinepanda-logo.png"
          alt="CinePanda logo"
          width={36}
          height={36}
          priority
          className="shrink-0 drop-shadow-sm"
        />
        <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          CinePanda
        </span>
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
                  ? "bg-cine-primary/10 text-cine-primary dark:bg-cine-primary/20 dark:text-slate-50"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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

