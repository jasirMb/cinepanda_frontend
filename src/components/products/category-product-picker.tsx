"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Search } from "lucide-react";

import { fetchProducts, type Product } from "@/lib/api/products";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const INR = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

/**
 * A searchable product picker dialog. Optionally scoped to a single category.
 * Used to swap/add products in the template wizard and the template editor.
 */
export function CategoryProductPicker({
  open,
  category,
  selectedId,
  title = "Select product",
  onClose,
  onPick,
}: {
  open: boolean;
  /** When set, only products in this category are listed. */
  category?: string | null;
  selectedId?: string;
  title?: string;
  onClose: () => void;
  onPick: (product: Product) => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset search whenever the picker is reopened (or its category changes).
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setDebounced("");
  }, [open, category]);

  const productsQuery = useQuery({
    queryKey: ["product-picker", category ?? "all", debounced],
    queryFn: () =>
      fetchProducts({
        category: category ?? undefined,
        search: debounced || undefined,
        limit: 50,
      }),
    enabled: open,
    staleTime: 60_000,
  });

  const products = productsQuery.data?.data ?? [];

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <div className="flex max-h-[80vh] flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {category ? `Browse all products in “${category}”` : "Browse all products"}
          </p>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {productsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No products found{debounced ? ` for “${debounced}”` : ""}.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((product) => {
                const isCurrent = product._id === selectedId;
                return (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => onPick(product)}
                    className={`flex w-full items-center gap-3 px-5 py-3 text-left transition ${
                      isCurrent
                        ? "bg-cine-primary/5 dark:bg-cine-primary/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {product.name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {[product.brand, product.subcategory]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {INR(product.price)}
                      </span>
                      {isCurrent ? (
                        <span className="rounded-md bg-cine-primary/10 px-2 py-0.5 text-[11px] font-semibold text-cine-primary">
                          Current
                        </span>
                      ) : (
                        <span className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          Select
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
