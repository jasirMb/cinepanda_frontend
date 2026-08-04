"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Tag } from "lucide-react";

import { productsKeys } from "@/hooks/useProducts";
import { fetchProduct } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function inr(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}
function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const query = useQuery({
    queryKey: productsKeys.detail(id),
    queryFn: () => fetchProduct(id),
    enabled: !!id,
    staleTime: 30_000,
  });
  const product = query.data;

  if (query.isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }
  if (query.isError || !product) {
    return (
      <div className="max-w-4xl space-y-3">
        <BackLink />
        <p className="text-sm text-red-500">Product not found.</p>
      </div>
    );
  }

  const specs = product.specifications
    ? Object.entries(product.specifications).filter(
        ([, v]) => v !== "" && v !== null && v !== undefined
      )
    : [];

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <BackLink />
        <Button size="sm" asChild>
          <Link href={`/products/new?edit=${product._id}`}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row">
        <div className="flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 sm:w-56">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Tag className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {product.category} · {product.subcategory}
          </span>
          <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">
            {product.name}
          </h2>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {inr(product.price)}
            <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {product.unit}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.brand && (
              <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                {product.brand}
              </span>
            )}
            {product.productModel && (
              <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                {product.productModel}
              </span>
            )}
          </div>
          {product.description && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {product.description}
            </p>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Added {fmtDate(product.createdAt)} · Updated{" "}
            {fmtDate(product.updatedAt)}
          </p>
        </div>
      </div>

      {/* Specifications */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-50">
          Specifications
        </div>
        {specs.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
            No specifications recorded.
          </p>
        ) : (
          <dl className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-2 sm:divide-y-0">
            {specs.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <dt className="text-slate-500 dark:text-slate-400">{key}</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/products"
      className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-cine-primary dark:text-slate-400"
    >
      <ArrowLeft className="h-4 w-4" /> Back to products
    </Link>
  );
}
