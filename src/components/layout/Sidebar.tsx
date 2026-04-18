"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import {
  ChevronsLeft,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

const navItems: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: UserPlus },
  { href: "/products", label: "Products", icon: Package },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/quotations", label: "Quotations", icon: Receipt },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/ledger", label: "Ledger", icon: Wallet },
];

const STORAGE_KEY = "cp-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (saved === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      }
      return next;
    });
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <aside
      className={clsx(
        "relative flex h-screen shrink-0 flex-col border-r border-slate-900/40 bg-slate-900 text-slate-200 transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand */}
      <div
        className={clsx(
          "flex items-center gap-3 border-b border-white/10 py-4",
          collapsed ? "justify-center px-0" : "px-5"
        )}
      >
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="absolute inset-0 rounded-xl bg-cine-primary/30 blur-md"
          />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/0 p-1.5 ring-1 ring-white/10">
            <Image
              src="/cinepanda-logo.png"
              alt="CinePanda logo"
              width={32}
              height={32}
              priority
              className="drop-shadow-[0_2px_8px_rgba(48,118,161,0.55)]"
            />
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-base font-semibold tracking-tight text-white">
              CinePanda
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cine-primary">
              Entertainment
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={clsx(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-cine-primary/20 text-white ring-1 ring-cine-primary/40"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon
                className={clsx(
                  "h-4 w-4 shrink-0",
                  active ? "text-cine-primary" : "text-slate-400 group-hover:text-white"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="space-y-1 border-t border-white/10 p-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={clsx(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white",
            collapsed && "justify-center px-2"
          )}
        >
          <ChevronsLeft
            className={clsx(
              "h-4 w-4 shrink-0 transition-transform",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
          className={clsx(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
