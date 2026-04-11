"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { productsKeys, useProducts, useCategories } from "@/hooks/useProducts";
import { ProductsTable } from "@/components/tables/ProductsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProduct, type Product } from "@/lib/api/products";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    subcategory: "",
    brand: ""
  });

  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data?.data ?? [];

  const selectedCategorySubs = useMemo(() => {
    if (!filters.category) return [];
    const cat = categories.find((c) => c.name === filters.category);
    return cat?.subcategories ?? [];
  }, [filters.category, categories]);

  const productsParams = useMemo(
    () => ({
      page,
      limit: 20,
      search: filters.search || undefined,
      category: filters.category || undefined,
      subcategory: filters.subcategory || undefined,
      brand: filters.brand || undefined
    }),
    [page, filters]
  );

  const productsQuery = useProducts(productsParams);
  const products = productsQuery.data?.data ?? [];
  const pagination = productsQuery.data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
      toast.success("Product deleted");
    },
    onError: () => {
      toast.error("Failed to delete product");
    }
  });

  function handleDelete(id: string) {
    setDeleteTarget(id);
  }

  // Toast from URL params (after create/update)
  useEffect(() => {
    const created = searchParams.get("created");
    const updated = searchParams.get("updated");
    const error = searchParams.get("error");

    if (created === "1") {
      toast.success("Product created successfully");
      router.replace("/products");
    } else if (updated === "1") {
      toast.success("Product updated successfully");
      router.replace("/products");
    } else if (typeof error === "string" && error.trim().length > 0) {
      toast.error(decodeURIComponent(error));
      router.replace("/products");
    }
  }, [router, searchParams]);

  // Reset subcategory when category changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, subcategory: "" }));
  }, [filters.category]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.category, filters.subcategory, filters.brand]);

  const isLoading = productsQuery.isLoading;
  const isError = productsQuery.isError;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <p className="text-red-400">Failed to load products. Please try again.</p>;
  }

  function ProductCard({ product }: { product: Product }) {
    return (
      <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/70 dark:bg-slate-900/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {product.category}
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {product.name}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {product.subcategory}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              {product.price.toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
              })}
            </span>
            <span className="rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-50/10 dark:text-slate-100">
              {product.unit}
            </span>
          </div>
        </div>

        {product.description && (
          <p className="mt-3 text-sm text-slate-600 line-clamp-2 dark:text-slate-300">
            {product.description}
          </p>
        )}

        <div className="mt-4 space-y-1 text-sm text-slate-700 dark:text-slate-200">
          {product.brand && (
            <p>
              <span className="font-semibold">Brand:</span> {product.brand}
            </p>
          )}
          {product.productModel && (
            <p>
              <span className="font-semibold">Model:</span> {product.productModel}
            </p>
          )}
        </div>

        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(product.specifications)
              .slice(0, 4)
              .map(([key, value]) => (
                <span
                  key={key}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {key}: {String(value)}
                </span>
              ))}
            {Object.keys(product.specifications).length > 4 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                +{Object.keys(product.specifications).length - 4} more
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="rounded-full bg-slate-200/70 px-3 py-1 dark:bg-slate-800/70">
            Added {new Date(product.createdAt).toLocaleDateString()}
          </span>
          <Link
            href={`/products/new?edit=${product._id}`}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-cine-primary"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => handleDelete(product._id)}
            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Products
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage your theater product catalog.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            Table
          </Button>
          <Button asChild>
            <Link href="/products/new">Add product</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 md:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Search products..."
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
        />
        <Select value={filters.category || "__all__"} onValueChange={(v) => setFilters((prev) => ({ ...prev, category: v === "__all__" ? "" : v }))}>
          <SelectTrigger>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat._id} value={cat.name}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.subcategory || "__all__"} onValueChange={(v) => setFilters((prev) => ({ ...prev, subcategory: v === "__all__" ? "" : v }))}>
          <SelectTrigger disabled={!filters.category}>
            <SelectValue placeholder="All subcategories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All subcategories</SelectItem>
            {selectedCategorySubs.map((sub) => (
              <SelectItem key={sub} value={sub}>{sub}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter by brand..."
          value={filters.brand}
          onChange={(e) => setFilters((prev) => ({ ...prev, brand: e.target.value }))}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setFilters({ search: "", category: "", subcategory: "", brand: "" })
          }
        >
          Reset filters
        </Button>
      </div>

      {/* Results info */}
      {pagination && (
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <p>
            Showing {products.length} of {pagination.total} products
            {pagination.totalPages > 1 && ` (page ${pagination.page} of ${pagination.totalPages})`}
          </p>
        </div>
      )}

      {/* Content */}
      {viewMode === "table" ? (
        <ProductsTable products={products} onDelete={handleDelete} />
      ) : (
        <>
          {products.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No products found. Try adjusting your filters or add a new product.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrev}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNext}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
