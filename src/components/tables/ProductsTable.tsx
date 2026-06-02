"use client";

import Link from "next/link";
import { Package, Pencil, Trash2 } from "lucide-react";
import { type Product } from "@/lib/api/products";

interface ProductsTableProps {
  products: Product[];
  onDelete?: (id: string) => void;
}

function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProductsTable({ products, onDelete }: ProductsTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <th className="px-4 py-3 text-left font-medium">Product</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Brand / Model</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {products.map((product) => (
              <tr
                key={product._id}
                className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                {/* Product */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-cine-primary/10 text-cine-primary">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="truncate font-medium text-slate-900 dark:text-slate-50"
                        title={product.name}
                      >
                        {product.name}
                      </p>
                      {product.subcategory && (
                        <p className="truncate text-xs text-slate-400">
                          {product.subcategory}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-2.5">
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {product.category}
                  </span>
                </td>

                {/* Brand / Model */}
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                  {product.brand || product.productModel ? (
                    <span className="truncate">
                      {product.brand || "—"}
                      {product.productModel && (
                        <span className="text-slate-400">
                          {" · "}
                          {product.productModel}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* Price */}
                <td className="px-4 py-2.5 text-right">
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                    {inr(product.price)}
                  </span>
                  {product.unit && (
                    <span className="block text-[11px] text-slate-400">
                      per {product.unit}
                    </span>
                  )}
                </td>

                {/* Created */}
                <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {fmtDate(product.createdAt)}
                </td>

                {/* Actions */}
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/products/new?edit=${product._id}`}
                      aria-label="Edit product"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-cine-primary dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(product._id)}
                        aria-label="Delete product"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
