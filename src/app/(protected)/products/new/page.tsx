"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  productsKeys,
  useCategories,
  useSubcategories,
  useSpecificationTemplate,
} from "@/hooks/useProducts";
import {
  createProduct,
  fetchProduct,
  updateProduct,
  type CreateProductPayload,
  type SpecificationField,
} from "@/lib/api/products";

type Option = { label: string; value: string };

const unitOptions: Option[] = [
  { label: "Per piece", value: "per piece" },
  { label: "Per sq ft", value: "per sq ft" },
  { label: "Per meter", value: "per meter" },
  { label: "Per kg", value: "per kg" },
  { label: "Per set", value: "per set" },
  { label: "Per roll", value: "per roll" },
  { label: "Per pair", value: "per pair" },
  { label: "Per pack", value: "per pack" },
  { label: "Per unit", value: "per unit" },
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
  specifications: {},
};

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const editId = searchParams.get("edit");
  const isEditMode = Boolean(editId);

  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data?.data ?? [];
  const categoryOptions: Option[] = categories.map((c) => ({
    label: c.name,
    value: c.name,
  }));

  const subcategoriesQuery = useSubcategories(formValues.category);
  const subcategories = subcategoriesQuery.data ?? [];
  const subcategoryOptions: Option[] = subcategories.map((s) => ({
    label: s,
    value: s,
  }));

  const specTemplateQuery = useSpecificationTemplate(formValues.subcategory);
  const specTemplate = specTemplateQuery.data ?? {};

  const productQuery = useQuery({
    queryKey: productsKeys.detail(editId as string),
    queryFn: () => fetchProduct(editId as string),
    enabled: isEditMode,
  });

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
        specifications: p.specifications ?? {},
      });
    }
  }, [productQuery.data]);

  const [initialLoaded, setInitialLoaded] = useState(false);
  useEffect(() => {
    if (productQuery.data && !initialLoaded) {
      setInitialLoaded(true);
      return;
    }
    if (initialLoaded || !isEditMode) {
      setFormValues((prev) => ({
        ...prev,
        subcategory: "",
        specifications: {},
      }));
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
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      updateProduct(editId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
      router.push("/products?updated=1");
    },
    onError: () => {
      toast.error("Failed to update product. Please try again.");
    },
  });

  const hasValidationErrors = useMemo(
    () => Object.keys(formErrors).length > 0,
    [formErrors]
  );

  function validate(values: FormValues) {
    const errors: Record<string, string> = {};
    if (!values.name.trim()) errors.name = "Product name is required.";
    if (!values.category.trim()) errors.category = "Category is required.";
    if (!values.subcategory.trim())
      errors.subcategory = "Subcategory is required.";
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
      specifications: { ...prev.specifications, [key]: value },
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
      specifications: formValues.specifications,
    };

    if (isEditMode) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function renderSpecField(key: string, field: SpecificationField) {
    const value = formValues.specifications[key] ?? "";

    if (field.type === "select" && field.options) {
      return (
        <Select
          value={String(value) || undefined}
          onValueChange={(v) => handleSpecChange(key, v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${field.label}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === "boolean") {
      return (
        <Select
          value={
            value === true ? "true" : value === false ? "false" : undefined
          }
          onValueChange={(v) =>
            handleSpecChange(key, v === "" ? undefined : v === "true")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Not specified" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (field.type === "number") {
      return (
        <Input
          type="number"
          value={String(value)}
          placeholder={field.unit ? `${field.label} (${field.unit})` : field.label}
          onChange={(e) =>
            handleSpecChange(
              key,
              e.target.value === "" ? undefined : Number(e.target.value)
            )
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
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {isEditMode ? "Edit Product" : "New Product"}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isEditMode
            ? "Update product details and specifications."
            : "Add a new product to the catalog."}
        </p>
      </div>

      {isEditMode && productQuery.isLoading ? (
        <div className="max-w-4xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Loading product details...
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="max-w-4xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Product Name *" error={formErrors.name}>
              <Input
                value={formValues.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. KEF LS50 Meta"
              />
            </Field>
            <Field label="Price (INR) *" error={formErrors.price}>
              <Input
                type="number"
                min="0"
                value={formValues.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category *" error={formErrors.category}>
              <Select
                value={formValues.category || undefined}
                onValueChange={(v) => handleChange("category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Subcategory *" error={formErrors.subcategory}>
              <Select
                value={formValues.subcategory || undefined}
                onValueChange={(v) => handleChange("subcategory", v)}
              >
                <SelectTrigger disabled={!formValues.category}>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Brand">
              <Input
                value={formValues.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                placeholder="e.g. JBL, Sony, Klipsch"
              />
            </Field>
            <Field label="Model">
              <Input
                value={formValues.productModel}
                onChange={(e) => handleChange("productModel", e.target.value)}
                placeholder="e.g. LS50 Meta"
              />
            </Field>
          </div>

          <Field label="Unit *" error={formErrors.unit}>
            <Select
              value={formValues.unit || undefined}
              onValueChange={(v) => handleChange("unit", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Description">
            <textarea
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
              rows={3}
              value={formValues.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Optional product description"
            />
          </Field>

          {/* Specifications */}
          {formValues.subcategory && Object.keys(specTemplate).length > 0 && (
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Specifications — {formValues.subcategory}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fill in the relevant specs for this product type.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Object.entries(specTemplate).map(([key, field]) => (
                  <Field
                    key={key}
                    label={`${field.label}${field.required ? " *" : ""}${
                      field.unit ? ` (${field.unit})` : ""
                    }`}
                  >
                    {renderSpecField(key, field)}
                  </Field>
                ))}
              </div>
            </div>
          )}

          {formValues.subcategory && specTemplateQuery.isLoading && (
            <p className="text-xs text-slate-500">
              Loading specification template...
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fields marked * are required.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/products")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={hasValidationErrors || isSaving}>
                {isEditMode
                  ? updateMutation.isPending
                    ? "Updating..."
                    : "Update Product"
                  : createMutation.isPending
                    ? "Creating..."
                    : "Create Product"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
