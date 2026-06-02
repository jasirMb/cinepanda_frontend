"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import {
  Building2,
  ChevronsLeft,
  CreditCard,
  FileText,
  FolderKanban,
  HardHat,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { getSidebarPreset, useSettingsStore } from "@/store/settings-store";
import { useShellStore } from "@/store/shell-store";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  { href: "/labours", label: "Labours", icon: HardHat },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/vendors", label: "Vendors", icon: Building2 },
  { href: "/payment-accounts", label: "Payment Accounts", icon: CreditCard },
  { href: "/ledger", label: "Ledger", icon: Wallet },
];

const STORAGE_KEY = "cp-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const sidebarId = useSettingsStore((s) => s.sidebarId);
  const sidebarPreset = getSidebarPreset(sidebarId);
  const mobileOpen = useShellStore((s) => s.mobileSidebarOpen);
  const closeMobile = useShellStore((s) => s.closeMobileSidebar);
  const openSettings = useShellStore((s) => s.openSettings);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (saved === "1") setCollapsed(true);
  }, []);

  // Close mobile drawer whenever the route changes
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

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
    // Drop all cached server data so the next user can't see the previous user's
    // leads/customers/quotations on a shared device.
    queryClient.clear();
    router.replace("/login");
  }

  function requestLogout() {
    setShowLogoutDialog(true);
    closeMobile();
  }

  // Mobile ignores the desktop `collapsed` preference — always show the full drawer
  const showExpanded = !collapsed || mobileOpen;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={closeMobile}
        aria-hidden
        className={clsx(
          "fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        )}
      />
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex h-screen shrink-0 flex-col border-r transition-[transform,width] duration-200 ease-out lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          showExpanded ? "w-64" : "w-16"
        )}
        style={{
          backgroundColor: sidebarPreset.bg,
          color: sidebarPreset.fg,
          borderColor: sidebarPreset.border,
        }}
      >
      {/* Brand */}
      <div
        className={clsx(
          "flex items-center gap-3 border-b border-white/10 py-4",
          showExpanded ? "px-5" : "justify-center px-0"
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
        {showExpanded && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-base font-semibold tracking-tight text-white">
              CinePanda
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cine-primary">
              Entertainment
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={closeMobile}
          aria-label="Close menu"
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-white/5 hover:text-white lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
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
              title={!showExpanded ? item.label : undefined}
              className={clsx(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                !showExpanded && "justify-center px-2",
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
              {showExpanded && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="space-y-1 border-t border-white/10 p-2">
        <button
          type="button"
          title="Settings"
          aria-label="Settings"
          onClick={() => openSettings()}
          className={clsx(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white",
            !showExpanded && "justify-center px-2"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {showExpanded && <span>Settings</span>}
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={clsx(
            "hidden w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white lg:flex",
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
          onClick={requestLogout}
          title="Logout"
          aria-label="Logout"
          className={clsx(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300",
            !showExpanded && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {showExpanded && <span>Logout</span>}
        </button>
      </div>
      </aside>

      <ConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="Log out?"
        description="You'll need to sign in again to access your dashboard, quotations, and projects."
        confirmLabel="Log out"
        variant="destructive"
        onConfirm={handleLogout}
      />
    </>
  );
}
