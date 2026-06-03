"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Check, Sparkles, Package, ArrowLeftRight, Search } from "lucide-react";

import { templatesKeys, useTemplates } from "@/hooks/useTemplates";
import { useCategories } from "@/hooks/useProducts";
import {
  createTemplate,
  deleteTemplate,
  suggestProducts,
  type CreateTemplatePayload,
  type SuggestResponse,
  type Template,
} from "@/lib/api/templates";
import { fetchProducts, type Product } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

type Step = "list" | "budget" | "requirements" | "review" | "creating";

interface ProductOption {
  _id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  rank: number; // 1-based priority (1 = most recommended); 0 = manually picked
  imageUrl?: string;
}

// Top-5 products per category key
type CategoryProducts = Record<string, ProductOption[]>;

// One selected product ID per category
type CategorySelection = Record<string, string>;

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const MAX_PER_CATEGORY = 20;
const TOP_HIGHLIGHTED = 3;

const INR = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const PRIORITY_LABELS: Record<number, string> = {
  1: "Most Recommended",
  2: "Recommended",
  3: "Good Choice",
};

const PRIORITY_COLORS: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  2: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  3: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

/* ────────────────────────────────────────────
   Page
   ──────────────────────────────────────────── */

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const templatesQuery = useTemplates();
  const categoriesQuery = useCategories();

  const templates = templatesQuery.data?.data ?? [];
  const categories = categoriesQuery.data?.data ?? [];

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── wizard state ──────────────────────────
  const [step, setStep] = useState<Step>("list");
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Top-5 products per category (from suggest API, priority-sorted)
  const [allCategoryProducts, setAllCategoryProducts] =
    useState<CategoryProducts>({});
  // One selected product per category
  const [categorySelection, setCategorySelection] =
    useState<CategorySelection>({});

  // Discount & GST
  const [discountType, setDiscountType] = useState<"flat" | "percent">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [gstPercent, setGstPercent] = useState("18");

  const [isFetchingProducts, setIsFetchingProducts] = useState(false);

  const budgetNum = Number(budget) || 0;
  const discountNum = Number(discountValue) || 0;
  const gstNum = Number(gstPercent) || 0;

  // Derive selected products from categorySelection
  const selectedProducts = useMemo(() => {
    const products: (ProductOption & { quantity: number })[] = [];
    Object.entries(categorySelection).forEach(([cat, productId]) => {
      const options = allCategoryProducts[cat] ?? [];
      const found = options.find((o) => o._id === productId);
      if (found) products.push({ ...found, quantity: 1 });
    });
    return products;
  }, [categorySelection, allCategoryProducts]);

  // Totals
  const subtotal = useMemo(
    () => selectedProducts.reduce((s, p) => s + p.price * p.quantity, 0),
    [selectedProducts]
  );

  const discountAmount = useMemo(() => {
    if (discountNum <= 0) return 0;
    return discountType === "percent"
      ? Math.round((discountNum / 100) * subtotal)
      : Math.min(discountNum, subtotal);
  }, [discountNum, discountType, subtotal]);

  const afterDiscount = subtotal - discountAmount;

  const gstAmount = useMemo(
    () => (gstNum > 0 ? Math.round((gstNum / 100) * afterDiscount) : 0),
    [gstNum, afterDiscount]
  );

  const grandTotal = afterDiscount + gstAmount;

  // Category keys derived from fetched data
  const productCategories = useMemo(
    () => Object.keys(allCategoryProducts),
    [allCategoryProducts]
  );

  // ── mutations ─────────────────────────────
  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
      resetWizard();
      toast.success("Template created successfully");
    },
    onError: () => {
      setStep("review");
      toast.error("Failed to create template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
      toast.success("Template deleted");
    },
    onError: () => {
      toast.error("Failed to delete template");
    },
  });

  // ── wizard helpers ────────────────────────
  function resetWizard() {
    setStep("list");
    setTemplateName("");
    setTemplateDescription("");
    setBudget("");
    setSelectedCategories([]);
    setAllCategoryProducts({});
    setCategorySelection({});
    setDiscountType("percent");
    setDiscountValue("");
    setGstPercent("18");
  }

  function toggleCategory(name: string) {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }

  async function fetchRecommendations() {
    setIsFetchingProducts(true);
    try {
      const results = await Promise.all(
        selectedCategories.map((cat) =>
          suggestProducts({ category: cat, limit: MAX_PER_CATEGORY })
        )
      );

      const catMap: CategoryProducts = {};
      const selection: CategorySelection = {};

      results.forEach((res: SuggestResponse) => {
        res.data.forEach((p, index) => {
          const option: ProductOption = {
            _id: p._id,
            name: p.name,
            category: p.category,
            subcategory: p.subcategory,
            price: p.price,
            rank: index + 1,
            imageUrl: p.imageUrl,
          };

          if (!catMap[p.category]) catMap[p.category] = [];
          if (catMap[p.category].length < MAX_PER_CATEGORY) {
            catMap[p.category].push(option);
          }

          // Auto-select the first (most recommended) product per category
          if (!selection[p.category]) {
            selection[p.category] = p._id;
          }
        });
      });

      setAllCategoryProducts(catMap);
      setCategorySelection(selection);
      setStep("review");
    } catch {
      toast.error("Failed to fetch product recommendations");
    } finally {
      setIsFetchingProducts(false);
    }
  }

  function selectProduct(category: string, productId: string) {
    setCategorySelection((prev) => ({ ...prev, [category]: productId }));
  }

  // Category whose product is being swapped via the "browse all" picker.
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);

  /** Swap in any product from the full catalog (injecting it into the option list if new). */
  function handlePickProduct(category: string, product: Product) {
    setAllCategoryProducts((prev) => {
      const existing = prev[category] ?? [];
      if (existing.some((o) => o._id === product._id)) return prev;
      const injected: ProductOption = {
        _id: product._id,
        name: product.name,
        category,
        subcategory: product.subcategory,
        price: product.price,
        rank: 0, // manual pick
        imageUrl: product.imageUrl,
      };
      return { ...prev, [category]: [injected, ...existing] };
    });
    setCategorySelection((prev) => ({ ...prev, [category]: product._id }));
    setReplaceTarget(null);
  }

  function handleConfirmCreate() {
    const manualItems: CreateTemplatePayload["manualItems"] = [];

    if (discountAmount > 0) {
      manualItems.push({
        name: discountType === "percent"
          ? `Discount ${discountNum}%`
          : `Discount (flat)`,
        type: "discount",
        amount: discountNum,
        isPercentage: discountType === "percent",
      });
    }

    if (gstAmount > 0) {
      manualItems.push({
        name: `GST ${gstNum}%`,
        type: "tax",
        amount: gstNum,
        isPercentage: true,
      });
    }

    const groups: CreateTemplatePayload["groups"] = selectedProducts.map(
      (product) => ({
        name: product.category,
        productItems: [
          {
            productId: product._id,
            productName: product.name,
            category: product.category,
            subcategory: product.subcategory,
            quantity: product.quantity,
            unitPrice: product.price,
          },
        ],
        manualItems: [],
      })
    );

    const payload: CreateTemplatePayload = {
      name: templateName,
      description: templateDescription || undefined,
      groups,
      manualItems,
    };

    setStep("creating");
    createMutation.mutate(payload);
  }

  function handleDeleteTemplate(id: string) {
    setDeleteTarget(id);
  }

  // ── loading / error states ────────────────
  if (templatesQuery.isLoading) {
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
  if (templatesQuery.isError) {
    return (
      <p className="text-red-400">Failed to load templates. Please try again.</p>
    );
  }

  // ── RENDER: wizard steps ──────────────────

  // Step 1: Budget + template info
  if (step === "budget") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            New Template
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Step 1 of 3 — Enter template details and budget.
          </p>
        </div>

        <div className="max-w-4xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <WizardField label="Template Name *">
            <Input
              placeholder="e.g. Premium Home Cinema"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </WizardField>
          <WizardField label="Description">
            <Input
              placeholder="e.g. Full 4K setup with Dolby Atmos"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
            />
          </WizardField>
          <WizardField label="Budget (INR) *">
            <Input
              type="number"
              placeholder="e.g. 500000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min={0}
            />
            {budgetNum > 0 && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {INR(budgetNum)}
              </p>
            )}
          </WizardField>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={resetWizard}>
              Cancel
            </Button>
            <Button
              disabled={!templateName.trim() || budgetNum <= 0}
              onClick={() => setStep("requirements")}
            >
              Next — Select Requirements
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Select requirement categories
  if (step === "requirements") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Select Requirements
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Step 2 of 3 — Choose the product categories needed for this setup.
          </p>
        </div>

        <div className="max-w-4xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          {categoriesQuery.isLoading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Loading categories...
            </p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No categories found.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.name);
                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => toggleCategory(cat.name)}
                    className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
                      isSelected
                        ? "border-cine-primary bg-cine-primary/10 text-cine-primary dark:border-cine-primary dark:bg-cine-primary/20 dark:text-slate-50"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {cat.name}
                    {cat.subcategories.length > 0 && (
                      <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">
                        {cat.subcategories.length} subcategories
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button variant="outline" onClick={() => setStep("budget")}>
              Back
            </Button>
            <Button
              disabled={selectedCategories.length === 0 || isFetchingProducts}
              onClick={fetchRecommendations}
            >
              {isFetchingProducts
                ? "Fetching products..."
                : "Next — View Recommendations"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Review recommended products
  if (step === "review") {
    const overBudget = grandTotal > budgetNum;
    const remaining = budgetNum - grandTotal;
    const budgetUsed = budgetNum > 0 ? Math.min(100, (grandTotal / budgetNum) * 100) : 0;

    return (
      <div className="max-w-4xl space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Review Recommended Products
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Step 3 of 3 — Select one product per category. #1 is the most
            recommended.
          </p>
        </div>

        {/* Budget banner */}
        <div
          className={`rounded-lg border px-5 py-4 shadow-sm ${
            overBudget
              ? "border-red-200 bg-gradient-to-r from-red-50 to-white dark:border-red-900/60 dark:from-red-950/30 dark:to-slate-900/60"
              : "border-emerald-200 bg-gradient-to-r from-emerald-50 to-white dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-slate-900/60"
          }`}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Grand Total
              </p>
              <p
                className={`text-2xl font-bold ${
                  overBudget
                    ? "text-red-600 dark:text-red-300"
                    : "text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {INR(grandTotal)}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Budget: {INR(budgetNum)} ·{" "}
                {selectedProducts.length} product
                {selectedProducts.length !== 1 ? "s" : ""} selected
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-semibold ${
                  overBudget
                    ? "text-red-600 dark:text-red-300"
                    : "text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {overBudget
                  ? `Over by ${INR(Math.abs(remaining))}`
                  : `${INR(remaining)} remaining`}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {Math.round(budgetUsed)}% of budget used
              </p>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full transition-all ${
                overBudget ? "bg-red-500" : "bg-emerald-500"
              }`}
              style={{ width: `${budgetUsed}%` }}
            />
          </div>
        </div>

        {/* Products grouped by category */}
        {productCategories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No products found for the selected categories.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {productCategories.map((cat) => {
              const options = allCategoryProducts[cat] ?? [];
              const selectedId = categorySelection[cat];
              const selected = options.find((o) => o._id === selectedId);

              return (
                <div
                  key={cat}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                >
                  {/* Category header */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {cat}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {options.length} option{options.length !== 1 ? "s" : ""}
                        {selected && (
                          <>
                            {" · Selected: "}
                            <span className="font-medium text-cine-primary">
                              {selected.name}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {selected && (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {INR(selected.price)}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 px-2.5 text-xs"
                        onClick={() => setReplaceTarget(cat)}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Browse all
                      </Button>
                    </div>
                  </div>

                  {/* Top recommendations */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {options.slice(0, TOP_HIGHLIGHTED).map((product) => (
                      <ProductRadioRow
                        key={product._id}
                        product={product}
                        isSelected={selectedId === product._id}
                        catKey={cat}
                        onSelect={selectProduct}
                        showBadge
                      />
                    ))}
                  </div>

                  {/* More options — scrollable */}
                  {options.length > TOP_HIGHLIGHTED && (
                    <>
                      <div className="border-t border-dashed border-slate-200 bg-slate-50/50 px-5 py-1.5 dark:border-slate-700 dark:bg-slate-800/30">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          More options ({options.length - TOP_HIGHLIGHTED}) — scroll to browse
                        </p>
                      </div>
                      <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                        {options.slice(TOP_HIGHLIGHTED).map((product) => (
                          <ProductRadioRow
                            key={product._id}
                            product={product}
                            isSelected={selectedId === product._id}
                            catKey={cat}
                            onSelect={selectProduct}
                            showBadge={false}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Adjustments */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Adjustments
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Apply discount and GST to the total.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <WizardField label="Discount">
              <div className="flex gap-2">
                <Select
                  value={discountType}
                  onValueChange={(v) =>
                    setDiscountType(v as "flat" | "percent")
                  }
                >
                  <SelectTrigger className="w-24 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="flat">Flat (INR)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="0"
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
              {discountAmount > 0 && (
                <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  −{INR(discountAmount)}
                </p>
              )}
            </WizardField>

            <WizardField label="GST %">
              <Input
                type="number"
                placeholder="18"
                min={0}
                max={100}
                value={gstPercent}
                onChange={(e) => setGstPercent(e.target.value)}
              />
              {gstAmount > 0 && (
                <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  +{INR(gstAmount)}
                </p>
              )}
            </WizardField>
          </div>
        </div>

        {/* Totals breakdown */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>
                Subtotal ({selectedProducts.length} product
                {selectedProducts.length !== 1 ? "s" : ""})
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-50">
                {INR(subtotal)}
              </span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600 dark:text-red-400">
                <span>
                  Discount{" "}
                  {discountType === "percent" ? `(${discountNum}%)` : "(flat)"}
                </span>
                <span>−{INR(discountAmount)}</span>
              </div>
            )}

            {gstAmount > 0 && (
              <div className="flex justify-between text-amber-700 dark:text-amber-400">
                <span>GST ({gstNum}%)</span>
                <span>+{INR(gstAmount)}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
              <span className="text-base font-bold text-slate-900 dark:text-slate-50">
                Grand Total
              </span>
              <span
                className={`text-base font-bold ${
                  overBudget
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {INR(grandTotal)}
              </span>
            </div>

            {overBudget && (
              <p className="text-xs font-medium text-red-500 dark:text-red-400">
                Exceeds budget by {INR(grandTotal - budgetNum)}
              </p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 rounded-lg border border-slate-200 bg-white px-5 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <Button variant="outline" onClick={() => setStep("requirements")}>
            Back
          </Button>
          <Button
            disabled={selectedProducts.length === 0}
            onClick={handleConfirmCreate}
          >
            <Check className="h-4 w-4" />
            Confirm & Create Template
          </Button>
        </div>

        {/* Browse-all product picker */}
        <CategoryProductPicker
          category={replaceTarget}
          selectedId={replaceTarget ? categorySelection[replaceTarget] : undefined}
          onClose={() => setReplaceTarget(null)}
          onPick={handlePickProduct}
        />
      </div>
    );
  }

  // Creating state
  if (step === "creating") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-700 dark:text-slate-300">
          Creating template...
        </p>
      </div>
    );
  }

  // ── RENDER: template list (default) ───────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Templates
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Reusable price blueprints for quotations.
          </p>
        </div>
        <Button onClick={() => setStep("budget")}>Create New Template</Button>
      </div>

      {/* Templates grid */}
      {templates.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No templates yet. Create your first template to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template._id}
              template={template}
              onDelete={handleDeleteTemplate}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete template"
        description="Are you sure you want to delete this template? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────
   Product Radio Row
   ──────────────────────────────────────────── */

function ProductRadioRow({
  product,
  isSelected,
  catKey,
  onSelect,
  showBadge,
}: {
  product: ProductOption;
  isSelected: boolean;
  catKey: string;
  onSelect: (category: string, productId: string) => void;
  showBadge: boolean;
}) {
  const priorityLabel = PRIORITY_LABELS[product.rank] ?? "";
  const priorityColor = PRIORITY_COLORS[product.rank] ?? PRIORITY_COLORS[3];

  return (
    <label
      className={`relative flex cursor-pointer items-center gap-3 px-5 py-3 transition ${
        isSelected
          ? "bg-cine-primary/5 dark:bg-cine-primary/10"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
      }`}
    >
      {isSelected && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-cine-primary"
        />
      )}
      <input
        type="radio"
        name={`cat-${catKey}`}
        checked={isSelected}
        onChange={() => onSelect(catKey, product._id)}
        className="sr-only"
      />

      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
          isSelected
            ? "border-cine-primary bg-cine-primary text-white"
            : "border-slate-300 dark:border-slate-600"
        }`}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </span>

      {product.rank === 0 ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          Your pick
        </span>
      ) : showBadge ? (
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityColor}`}
        >
          {product.rank === 1 && <Sparkles className="h-3 w-3" />}#
          {product.rank} {priorityLabel}
        </span>
      ) : (
        <span className="w-6 shrink-0 text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          #{product.rank}
        </span>
      )}

      {/* Thumbnail */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
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
        <p
          className={`truncate text-sm ${
            isSelected
              ? "font-semibold text-slate-900 dark:text-slate-50"
              : "font-medium text-slate-700 dark:text-slate-300"
          }`}
        >
          {product.name}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {product.subcategory}
        </p>
      </div>

      <p
        className={`shrink-0 text-sm font-bold ${
          isSelected
            ? "text-cine-primary"
            : "text-slate-700 dark:text-slate-200"
        }`}
      >
        {INR(product.price)}
      </p>
    </label>
  );
}

/* ────────────────────────────────────────────
   Template Card Component
   ──────────────────────────────────────────── */

function WizardField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────
   Browse-all product picker — swap the selected product for any product in
   the same category (with image + live search), not just the suggested few.
   ──────────────────────────────────────────── */

function CategoryProductPicker({
  category,
  selectedId,
  onClose,
  onPick,
}: {
  category: string | null;
  selectedId?: string;
  onClose: () => void;
  onPick: (category: string, product: Product) => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset the search when the picker opens for a different category.
  useEffect(() => {
    setSearch("");
    setDebounced("");
  }, [category]);

  const productsQuery = useQuery({
    queryKey: ["template-picker", category, debounced],
    queryFn: () =>
      fetchProducts({
        category: category ?? undefined,
        search: debounced || undefined,
        limit: 50,
      }),
    enabled: !!category,
    staleTime: 60_000,
  });

  const products = productsQuery.data?.data ?? [];

  return (
    <Dialog open={!!category} onClose={onClose} className="max-w-2xl">
      <div className="flex max-h-[80vh] flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Replace product
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {category ? `Browse all products in “${category}”` : ""}
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
                    onClick={() => category && onPick(category, product)}
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

function TemplateCard({
  template,
  onDelete,
}: {
  template: Template;
  onDelete: (id: string) => void;
}) {
  const totalProducts = template.groups.reduce(
    (sum, g) => sum + g.productItems.length,
    0
  );
  return (
    <div className="group flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
      <Link href={`/templates/${template._id}`} className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300">
            <span className="text-base font-bold">T</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
              {template.name}
            </h3>
            {template.description && (
              <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                {template.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {INR(template.grandTotal)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {totalProducts} product{totalProducts !== 1 ? "s" : ""} ·{" "}
            {template.groups.length} group
            {template.groups.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {template.groups.slice(0, 5).map((group) => (
            <span
              key={group.name}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {group.name} ({group.productItems.length})
            </span>
          ))}
          {template.groups.length > 5 && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              +{template.groups.length - 5} more
            </span>
          )}
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          Created {new Date(template.createdAt).toLocaleDateString()}
        </span>
        <div className="flex gap-1.5">
          <Link
            href={`/templates/${template._id}`}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            View
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onDelete(template._id);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
