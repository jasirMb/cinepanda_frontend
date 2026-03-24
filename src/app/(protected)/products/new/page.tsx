"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  productsKeys,
  useCategories,
  useSubcategories,
  useSpecificationTemplate
} from "@/hooks/useProducts";
import {
  createProduct,
  fetchProduct,
  updateProduct,
  type CreateProductPayload,
  type SpecificationField
} from "@/lib/api/products";

type ToastVariant = "success" | "error";

interface ToastState {
  open: boolean;
  message: string;
  variant: ToastVariant;
}

type Option = { label: string; value: string };

function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

const unitOptions: Option[] = [
  { label: "Per piece", value: "per piece" },
  { label: "Per sq ft", value: "per sq ft" },
  { label: "Per meter", value: "per meter" },
  { label: "Per kg", value: "per kg" },
  { label: "Per set", value: "per set" },
  { label: "Per roll", value: "per roll" },
  { label: "Per pair", value: "per pair" },
  { label: "Per pack", value: "per pack" },
  { label: "Per unit", value: "per unit" }
];

interface FormValues {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  productModel: string;
  price: string;
  unit: string;
  specifications: Record<string, any>;
}

const initialFormValues: FormValues = {
  name: "",
  description: "",
  category: "",
  subcategory: "",
  brand: "",
  productModel: "",
  price: "",
  unit: "",
  specifications: {}
};

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    variant: "success"
  });

  // Fetch categories for dropdown
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data?.data ?? [];
  const categoryOptions: Option[] = categories.map((c) => ({
    label: c.name,
    value: c.name
  }));

  // Fetch subcategories when category is selected
  const subcategoriesQuery = useSubcategories(formValues.category);
  const subcategories = subcategoriesQuery.data ?? [];
  const subcategoryOptions: Option[] = subcategories.map((s) => ({
    label: s,
    value: s
  }));

  // Fetch specification template when subcategory is selected
  const specTemplateQuery = useSpecificationTemplate(formValues.subcategory);
  const specTemplate = specTemplateQuery.data ?? {};

  // Fetch existing product for edit mode
  const productQuery = useQuery({
    queryKey: ["product", editId],
    queryFn: () => fetchProduct(editId as string),
    enabled: isEditMode
  });

  // Populate form on edit
  useEffect(() => {
    if (productQuery.data) {
      const p = productQuery.data;
      setFormValues({
        name: p.name ?? "",
        description: p.description ?? "",
        category: p.category ?? "",
        subcategory: p.subcategory ?? "",
        brand: p.brand ?? "",
        productModel: p.productModel ?? "",
        price: String(p.price ?? ""),
        unit: p.unit ?? "",
        specifications: p.specifications ?? {}
      });
    }
  }, [productQuery.data]);

  // Reset subcategory when category changes (unless loading edit data)
  const [initialLoaded, setInitialLoaded] = useState(false);
  useEffect(() => {
    if (productQuery.data && !initialLoaded) {
      setInitialLoaded(true);
      return;
    }
    if (initialLoaded || !isEditMode) {
      setFormValues((prev) => ({ ...prev, subcategory: "", specifications: {} }));
    }
  }, [formValues.category]);

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
      router.push("/products?created=1");
    },
    onError: (error: unknown) => {
      let message = "Failed to create product. Please try again.";
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as any).response?.data?.error === "string"
      ) {
        message = (error as any).response.data.error;
      }
      setToast({ open: true, message, variant: "error" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      updateProduct(editId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
      router.push("/products?updated=1");
    },
    onError: () => {
      setToast({
        open: true,
        message: "Failed to update product. Please try again.",
        variant: "error"
      });
    }
  });

  const hasValidationErrors = useMemo(
    () => Object.keys(formErrors).length > 0,
    [formErrors]
  );

  function validate(values: FormValues) {
    const errors: Record<string, string> = {};

    if (!values.name.trim()) errors.name = "Product name is required.";
    if (!values.category.trim()) errors.category = "Category is required.";
    if (!values.subcategory.trim()) errors.subcategory = "Subcategory is required.";
    if (!values.price.trim()) {
      errors.price = "Price is required.";
    } else if (isNaN(Number(values.price)) || Number(values.price) < 0) {
      errors.price = "Price must be a valid positive number.";
    }
    if (!values.unit.trim()) errors.unit = "Unit is required.";

    return errors;
  }

  function handleChange(field: keyof FormValues, value: string) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSpecChange(key: string, value: any) {
    setFormValues((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, [key]: value }
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(formValues);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: CreateProductPayload = {
      name: formValues.name.trim(),
      description: formValues.description.trim() || undefined,
      category: formValues.category.trim(),
      subcategory: formValues.subcategory.trim(),
      brand: formValues.brand.trim() || undefined,
      productModel: formValues.productModel.trim() || undefined,
      price: Number(formValues.price),
      unit: formValues.unit.trim(),
      specifications: formValues.specifications
    };

    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function renderSpecField(key: string, field: SpecificationField) {
    const value = formValues.specifications[key] ?? "";

    if (field.type === "select" && field.options) {
      return (
        <Select
          value={String(value)}
          onChange={(v) => handleSpecChange(key, v)}
          options={field.options.map((o) => ({ label: o, value: o }))}
          placeholder={`Select ${field.label}`}
        />
      );
    }

    if (field.type === "boolean") {
      return (
        <select
          value={value === true ? "true" : value === false ? "false" : ""}
          onChange={(e) =>
            handleSpecChange(key, e.target.value === "" ? undefined : e.target.value === "true")
          }
          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
        >
          <option value="">Not specified</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    if (field.type === "number") {
      return (
        <Input
          type="number"
          value={String(value)}
          placeholder={field.unit ? `${field.label} (${field.unit})` : field.label}
          onChange={(e) =>
            handleSpecChange(key, e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      );
    }

    return (
      <Input
        value={String(value)}
        placeholder={field.unit ? `${field.label} (${field.unit})` : field.label}
        onChange={(e) => handleSpecChange(key, e.target.value || undefined)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {isEditMode ? "Edit product" : "Add product"}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isEditMode
              ? "Update product details and specifications."
              : "Add a new product to the catalog."}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/products">Back to products</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        {isEditMode && productQuery.isLoading && (
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Loading product details...
          </p>
        )}
        <form className="space-y-3" onSubmit={handleSubmit} noValidate>
          {/* Basic fields */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Product name *
              </label>
              <Input
                value={formValues.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Category *
              </label>
              <Select
                value={formValues.category}
                onChange={(v) => handleChange("category", v)}
                options={categoryOptions}
                placeholder="Select category"
              />
              {formErrors.category && (
                <p className="text-xs text-red-500">{formErrors.category}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Subcategory *
              </label>
              <Select
                value={formValues.subcategory}
                onChange={(v) => handleChange("subcategory", v)}
                options={subcategoryOptions}
                placeholder="Select subcategory"
                disabled={!formValues.category}
              />
              {formErrors.subcategory && (
                <p className="text-xs text-red-500">{formErrors.subcategory}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Brand
              </label>
              <Input
                value={formValues.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                placeholder="e.g., JBL, Sony, Klipsch"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Model
              </label>
              <Input
                value={formValues.productModel}
                onChange={(e) => handleChange("productModel", e.target.value)}
                placeholder="e.g., LS50 Meta"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Price (INR) *
              </label>
              <Input
                type="number"
                min="0"
                value={formValues.price}
                onChange={(e) => handleChange("price", e.target.value)}
              />
              {formErrors.price && (
                <p className="text-xs text-red-500">{formErrors.price}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Unit *
              </label>
              <Select
                value={formValues.unit}
                onChange={(v) => handleChange("unit", v)}
                options={unitOptions}
                placeholder="Select unit"
              />
              {formErrors.unit && (
                <p className="text-xs text-red-500">{formErrors.unit}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              className="min-h-[90px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              value={formValues.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Optional product description"
            />
          </div>

          {/* Dynamic specifications */}
          {formValues.subcategory && Object.keys(specTemplate).length > 0 && (
            <div className="space-y-3">
              <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Specifications — {formValues.subcategory}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fill in the relevant specs for this product type.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(specTemplate).map(([key, field]) => (
                  <div key={key} className="space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      {field.label}
                      {field.required && " *"}
                      {field.unit && (
                        <span className="ml-1 text-slate-400">({field.unit})</span>
                      )}
                    </label>
                    {renderSpecField(key, field)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {formValues.subcategory && specTemplateQuery.isLoading && (
            <p className="text-xs text-slate-500">Loading specification template...</p>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Fields marked * are required.
            </div>
            <Button type="submit" disabled={hasValidationErrors || isSaving}>
              {isEditMode
                ? updateMutation.isPending
                  ? "Updating..."
                  : "Update product"
                : createMutation.isPending
                ? "Creating..."
                : "Create product"}
            </Button>
          </div>
        </form>
      </div>

      {/* Toast */}
      {toast.open && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg backdrop-blur-sm dark:border-slate-700">
          <div
            className={
              toast.variant === "success"
                ? "border-l-4 border-emerald-500 pl-3"
                : "border-l-4 border-red-500 pl-3"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <p
                className={
                  toast.variant === "success"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-red-700 dark:text-red-400"
                }
              >
                {toast.message}
              </p>
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                onClick={() => setToast((prev) => ({ ...prev, open: false }))}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
