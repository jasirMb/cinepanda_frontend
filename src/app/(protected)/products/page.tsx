"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react";

import { productsKeys, useProducts, useCategories } from "@/hooks/useProducts";
import { ProductsTable } from "@/components/tables/ProductsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProduct, fetchProductBrands, type Product } from "@/lib/api/products";
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

  // Debounced text inputs — type freely, the query updates after a short pause.
  const [searchInput, setSearchInput] = useState("");
  const [brandInput, setBrandInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput && prev.brand === brandInput
          ? prev
          : { ...prev, search: searchInput, brand: brandInput }
      );
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, brandInput]);

  const brandsQuery = useQuery({
    queryKey: ["products", "brands"],
    queryFn: fetchProductBrands,
    staleTime: 5 * 60_000,
  });
  const brandSuggestions = brandsQuery.data ?? [];

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
      limit: 12,
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
    const specs = product.specifications
      ? Object.entries(product.specifications)
      : [];
    return (
      <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
        {/* Image banner */}
        <div className="relative flex h-24 w-full items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
            />
          ) : (
            <Tag className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          )}
          <span className="absolute left-2 top-2 rounded-md bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-slate-700 backdrop-blur dark:bg-slate-900/80 dark:text-slate-200">
            {product.category}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3">
          {/* Title */}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
              {product.name}
            </h3>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {product.subcategory}
              {(product.brand || product.productModel) &&
                ` · ${[product.brand, product.productModel].filter(Boolean).join(" ")}`}
            </p>
          </div>

          {/* Price */}
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {product.price.toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              })}
            </p>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {product.unit}
            </span>
          </div>

          {specs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {specs.slice(0, 3).map(([key, value]) => (
                <span
                  key={key}
                  className="truncate rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {key}: {String(value)}
                </span>
              ))}
              {specs.length > 3 && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  +{specs.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Link
              href={`/products/${product._id}`}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Eye className="h-3 w-3" />
              View
            </Link>
            <Link
              href={`/products/new?edit=${product._id}`}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(product._id)}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
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
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Search products..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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
        <div>
          <Input
            list="product-brand-suggestions"
            placeholder="Filter by brand..."
            value={brandInput}
            onChange={(e) => setBrandInput(e.target.value)}
          />
          <datalist id="product-brand-suggestions">
            {brandSuggestions.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchInput("");
            setBrandInput("");
            setFilters({ search: "", category: "", subcategory: "", brand: "" });
          }}
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-800 sm:flex-row">
          <p className="text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {(pagination.page - 1) * 12 + 1}–
              {Math.min(pagination.page * 12, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {pagination.total}
            </span>{" "}
            products
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="px-1 text-slate-600 dark:text-slate-300">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
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
