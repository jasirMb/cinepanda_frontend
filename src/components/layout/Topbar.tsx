"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useShellStore } from "@/store/shell-store";
import { useSettingsStore } from "@/store/settings-store";

function avatarInitials(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "A";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase() || source[0].toUpperCase();
}

function TopbarAvatar() {
  const profile = useSettingsStore((s) => s.profile);
  const openSettings = useShellStore((s) => s.openSettings);
  return (
    <button
      type="button"
      onClick={() => openSettings()}
      title="Settings"
      aria-label="Open settings"
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600 transition hover:ring-2 hover:ring-cine-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
    >
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt="Profile"
          className="h-full w-full object-cover"
        />
      ) : (
        avatarInitials(profile.name, profile.email)
      )}
    </button>
  );
}

interface PageMeta {
  title: string;
  subtitle?: string;
}

const ROUTE_META: { match: (p: string) => boolean; meta: PageMeta }[] = [
  {
    match: (p) => p === "/dashboard",
    meta: { title: "Dashboard", subtitle: "Overview of your business" },
  },

  {
    match: (p) => p === "/leads/new",
    meta: { title: "New Lead", subtitle: "Capture a new business lead" },
  },
  {
    match: (p) => p.startsWith("/leads"),
    meta: { title: "Leads", subtitle: "Manage your leads pipeline" },
  },

  {
    match: (p) => p === "/products/new",
    meta: { title: "New Product", subtitle: "Add a product to your catalog" },
  },
  {
    match: (p) => p.startsWith("/products"),
    meta: { title: "Products", subtitle: "Catalog of available products" },
  },

  {
    match: (p) => /^\/templates\/[^/]+$/.test(p),
    meta: { title: "Template", subtitle: "Template details" },
  },
  {
    match: (p) => p.startsWith("/templates"),
    meta: { title: "Templates", subtitle: "Quotation templates" },
  },

  {
    match: (p) => /^\/quotations\/[^/]+\/preview$/.test(p),
    meta: { title: "Quotation Preview", subtitle: "Preview before sending" },
  },
  {
    match: (p) => /^\/quotations\/[^/]+$/.test(p),
    meta: { title: "Quotation Details", subtitle: "Quotation overview" },
  },
  {
    match: (p) => p.startsWith("/quotations"),
    meta: { title: "Quotations", subtitle: "All quotations" },
  },

  {
    match: (p) => p === "/customers",
    meta: { title: "Customers", subtitle: "Your customer directory" },
  },

  {
    match: (p) => p.startsWith("/labours"),
    meta: { title: "Labours", subtitle: "Your labour / crew directory" },
  },

  {
    match: (p) => p.startsWith("/staff/settings"),
    meta: { title: "Staff Settings", subtitle: "Holidays & weekly offs" },
  },
  {
    match: (p) => p.startsWith("/staff"),
    meta: { title: "Staff", subtitle: "Team, attendance & salary" },
  },

  {
    match: (p) => p.startsWith("/vendors"),
    meta: { title: "Vendors", subtitle: "Suppliers & payees" },
  },
  {
    match: (p) => p.startsWith("/payment-accounts"),
    meta: { title: "Payment Accounts", subtitle: "Banks, cash & UPI" },
  },

  {
    match: (p) => p === "/projects/new",
    meta: { title: "New Project", subtitle: "Start a new project" },
  },
  {
    match: (p) => /^\/projects\/[^/]+\/edit$/.test(p),
    meta: { title: "Edit Project", subtitle: "Update project details" },
  },
  {
    match: (p) => /^\/projects\/[^/]+$/.test(p),
    meta: { title: "Project Details", subtitle: "Project overview" },
  },
  {
    match: (p) => p.startsWith("/projects"),
    meta: { title: "Projects", subtitle: "All active projects" },
  },

  {
    match: (p) => p === "/ledger/new",
    meta: { title: "New Ledger Entry", subtitle: "Record income or expense" },
  },
  {
    match: (p) => /^\/ledger\/[^/]+\/edit$/.test(p),
    meta: { title: "Edit Ledger Entry", subtitle: "Update entry details" },
  },
  {
    match: (p) => p.startsWith("/ledger"),
    meta: { title: "Ledger", subtitle: "Income and expense tracking" },
  },
];

function resolveMeta(pathname: string): PageMeta {
  for (const r of ROUTE_META) {
    if (r.match(pathname)) return r.meta;
  }
  return { title: "Cinepanda", subtitle: "Admin Console" };
}

export function Topbar() {
  const pathname = usePathname();
  const meta = resolveMeta(pathname);
  const openMobileSidebar = useShellStore((s) => s.openMobileSidebar);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
      <button
        type="button"
        onClick={openMobileSidebar}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src="/cinepanda-logo.png"
          alt="Cinepanda logo"
          width={32}
          height={32}
          priority
          className="hidden shrink-0 drop-shadow-sm sm:block"
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
            {meta.title}
          </p>
          {meta.subtitle && (
            <p className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
              {meta.subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <TopbarAvatar />
      </div>
    </header>
  );
}
