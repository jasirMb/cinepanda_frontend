"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { templatesKeys, useTemplate } from "@/hooks/useTemplates";
import {
  updateTemplate,
  deleteTemplate,
  type CreateTemplatePayload,
  type TemplateManualItem,
  type TemplateGroup,
} from "@/lib/api/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";

const INR = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

interface EditableProductItem {
  productId: string;
  productName: string;
  category: string;
  subcategory: string;
  quantity: number;
  unitPrice: number;
}

interface EditableGroup {
  name: string;
  productItems: EditableProductItem[];
  manualItems: TemplateManualItem[];
}

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const templateId = params.id as string;

  const templateQuery = useTemplate(templateId);
  const template = templateQuery.data;

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groups, setGroups] = useState<EditableGroup[]>([]);
  const [manualItems, setManualItems] = useState<TemplateManualItem[]>([]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description ?? "");
      setGroups(
        template.groups.map((g) => ({
          name: g.name,
          productItems: g.productItems.map((p) => ({
            productId: p.productId,
            productName: p.productName,
            category: p.category,
            subcategory: p.subcategory,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
          })),
          manualItems: g.manualItems.map((m) => ({ ...m })),
        }))
      );
      setManualItems(template.manualItems.map((m) => ({ ...m })));
    }
  }, [template]);

  const groupSubtotals = useMemo(
    () =>
      groups.map((g) => {
        const productSum = g.productItems.reduce(
          (s, p) => s + p.quantity * p.unitPrice,
          0
        );
        const manualSum = g.manualItems.reduce((s, m) => {
          const resolved = m.isPercentage
            ? (m.amount / 100) * productSum
            : m.amount;
          return s + (m.type === "discount" ? -resolved : resolved);
        }, 0);
        return Math.max(0, productSum + manualSum);
      }),
    [groups]
  );

  const groupsTotal = useMemo(
    () => groupSubtotals.reduce((s, v) => s + v, 0),
    [groupSubtotals]
  );

  const templateManualTotal = useMemo(
    () =>
      manualItems.reduce((s, m) => {
        const resolved = m.isPercentage
          ? (m.amount / 100) * groupsTotal
          : m.amount;
        return s + (m.type === "discount" ? -resolved : resolved);
      }, 0),
    [manualItems, groupsTotal]
  );

  const grandTotal = Math.max(0, groupsTotal + templateManualTotal);

  const updateMutation = useMutation({
    mutationFn: (payload: CreateTemplatePayload) =>
      updateTemplate(templateId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
      queryClient.invalidateQueries({
        queryKey: templatesKeys.detail(templateId),
      });
      setIsEditing(false);
      toast.success("Template updated successfully");
    },
    onError: () => toast.error("Failed to update template"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
      router.push("/templates");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  function handleSave() {
    const payload: CreateTemplatePayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      groups: groups.map((g) => ({
        name: g.name,
        productItems: g.productItems.map((p) => ({
          productId: p.productId,
          productName: p.productName,
          category: p.category,
          subcategory: p.subcategory,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
        })),
        manualItems: g.manualItems,
      })),
      manualItems,
    };
    updateMutation.mutate(payload);
  }

  function handleCancel() {
    if (template) {
      setName(template.name);
      setDescription(template.description ?? "");
      setGroups(
        template.groups.map((g) => ({
          name: g.name,
          productItems: g.productItems.map((p) => ({
            productId: p.productId,
            productName: p.productName,
            category: p.category,
            subcategory: p.subcategory,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
          })),
          manualItems: g.manualItems.map((m) => ({ ...m })),
        }))
      );
      setManualItems(template.manualItems.map((m) => ({ ...m })));
    }
    setIsEditing(false);
  }

  function updateProductField(
    gi: number,
    pi: number,
    field: "quantity" | "unitPrice",
    value: number
  ) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? {
              ...g,
              productItems: g.productItems.map((p, j) =>
                j === pi
                  ? {
                      ...p,
                      [field]: Math.max(field === "quantity" ? 1 : 0, value),
                    }
                  : p
              ),
            }
          : g
      )
    );
  }

  function removeProduct(gi: number, pi: number) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, productItems: g.productItems.filter((_, j) => j !== pi) }
          : g
      )
    );
  }

  function updateManualItem(
    gi: number,
    mi: number,
    field: keyof TemplateManualItem,
    value: string | number | boolean
  ) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? {
              ...g,
              manualItems: g.manualItems.map((m, j) =>
                j === mi ? { ...m, [field]: value } : m
              ),
            }
          : g
      )
    );
  }

  function removeGroupManualItem(gi: number, mi: number) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, manualItems: g.manualItems.filter((_, j) => j !== mi) }
          : g
      )
    );
  }

  function updateTemplateManualItem(
    mi: number,
    field: keyof TemplateManualItem,
    value: string | number | boolean
  ) {
    setManualItems((prev) =>
      prev.map((m, i) => (i === mi ? { ...m, [field]: value } : m))
    );
  }

  function removeTemplateManualItem(mi: number) {
    setManualItems((prev) => prev.filter((_, i) => i !== mi));
  }

  function addTemplateManualItem() {
    setManualItems((prev) => [
      ...prev,
      { name: "", type: "service", amount: 0, isPercentage: false },
    ]);
  }

  function removeGroup(gi: number) {
    setGroups((prev) => prev.filter((_, i) => i !== gi));
  }

  if (templateQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (templateQuery.isError || !template) {
    return (
      <div className="space-y-4">
        <p className="text-red-400">
          Failed to load template. It may have been deleted.
        </p>
        <Button variant="outline" asChild>
          <Link href="/templates">
            <ArrowLeft className="h-4 w-4" /> Back to templates
          </Link>
        </Button>
      </div>
    );
  }

  const totalProducts = (isEditing ? groups : template.groups).reduce(
    (s, g) => s + g.productItems.length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {isEditing ? "Edit Template" : template.name}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isEditing
              ? "Update template details, groups, and adjustments."
              : template.description || "Template details"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/templates">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          {!isEditing && (
            <>
              <Button size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit-mode name/description card */}
      {isEditing && (
        <div className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <Field label="Template Name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
            />
          </Field>
          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
          </Field>
        </div>
      )}

      {/* Grand total banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-gradient-to-r from-emerald-50 to-white px-5 py-4 shadow-sm dark:border-slate-800 dark:from-emerald-950/30 dark:to-slate-900/60">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Grand Total
          </p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {INR(isEditing ? grandTotal : template.grandTotal)}
          </p>
        </div>
        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
          <p>
            {totalProducts} product{totalProducts !== 1 ? "s" : ""} ·{" "}
            {(isEditing ? groups : template.groups).length} group
            {(isEditing ? groups : template.groups).length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {(isEditing ? groups : template.groups).map((group, gi) => {
          const subtotal = isEditing
            ? groupSubtotals[gi] ?? 0
            : (group as TemplateGroup).subtotal;

          return (
            <div
              key={gi}
              className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {group.productItems.length} product
                    {group.productItems.length !== 1 ? "s" : ""} · Subtotal{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {INR(subtotal)}
                    </span>
                  </p>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => removeGroup(gi)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.productItems.map((item, pi) => (
                  <div
                    key={pi}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                        {item.productName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.category} · {item.subcategory}
                      </p>
                    </div>

                    {isEditing ? (
                      <>
                        <label className="flex items-center gap-1.5 text-xs text-slate-500">
                          Qty
                          <input
                            type="number"
                            min={1}
                            value={
                              (group as EditableGroup).productItems[pi]
                                .quantity
                            }
                            onChange={(e) =>
                              updateProductField(
                                gi,
                                pi,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="h-8 w-16 rounded-md border border-slate-200 bg-white px-2 text-center text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-500">
                          Price
                          <input
                            type="number"
                            min={0}
                            value={
                              (group as EditableGroup).productItems[pi]
                                .unitPrice
                            }
                            onChange={(e) =>
                              updateProductField(
                                gi,
                                pi,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8 w-28 rounded-md border border-slate-200 bg-white px-2 text-right text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeProduct(gi, pi)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ×{item.quantity}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          @ {INR(item.unitPrice)}
                        </span>
                        <span className="w-28 text-right text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {INR(item.quantity * item.unitPrice)}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {group.manualItems.length > 0 && (
                <div className="border-t border-dashed border-slate-200 dark:border-slate-700">
                  <div className="px-5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Group Adjustments
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100 px-5 pb-3 dark:divide-slate-800">
                    {group.manualItems.map((m, mi) => (
                      <ManualItemRow
                        key={mi}
                        item={m}
                        editable={isEditing}
                        editableValue={(group as EditableGroup).manualItems[mi]}
                        onChange={(field, value) =>
                          updateManualItem(gi, mi, field, value)
                        }
                        onRemove={() => removeGroupManualItem(gi, mi)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Template-level adjustments */}
      {((isEditing ? manualItems : template.manualItems).length > 0 ||
        isEditing) && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Template Adjustments
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                GST, discounts, services applied across all groups.
              </p>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={addTemplateManualItem}
                className="inline-flex items-center gap-1 rounded-md border border-cine-primary/40 bg-cine-primary/10 px-2.5 py-1 text-xs font-semibold text-cine-primary transition hover:bg-cine-primary/20"
              >
                <Plus className="h-3 w-3" /> Add Adjustment
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
            {(isEditing ? manualItems : template.manualItems).map((m, mi) => (
              <div key={mi} className="py-3">
                <ManualItemRow
                  item={m}
                  editable={isEditing}
                  editableValue={manualItems[mi]}
                  onChange={(field, value) =>
                    updateTemplateManualItem(mi, field, value)
                  }
                  onRemove={() => removeTemplateManualItem(mi)}
                />
              </div>
            ))}
            {!isEditing && template.manualItems.length === 0 && (
              <p className="py-3 text-xs text-slate-500 dark:text-slate-400">
                No template-level adjustments.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Edit footer */}
      {isEditing && (
        <div className="flex items-center justify-end gap-3 rounded-lg border border-slate-200 bg-white px-5 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}

      {/* Meta */}
      {!isEditing && (
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Created {new Date(template.createdAt).toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Updated {new Date(template.updatedAt).toLocaleString()}
          </span>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) setShowDeleteDialog(false);
        }}
        title="Delete template"
        description="Are you sure you want to delete this template? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          deleteMutation.mutate(templateId);
          setShowDeleteDialog(false);
        }}
      />
    </div>
  );
}

function Field({
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

function ManualItemRow({
  item,
  editable,
  editableValue,
  onChange,
  onRemove,
}: {
  item: TemplateManualItem;
  editable: boolean;
  editableValue: TemplateManualItem;
  onChange: (
    field: keyof TemplateManualItem,
    value: string | number | boolean
  ) => void;
  onRemove: () => void;
}) {
  if (editable) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={editableValue.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="e.g. GST 18%"
          className="h-9 min-w-[140px] flex-1"
        />
        <Select
          value={editableValue.type}
          onValueChange={(v) => onChange("type", v)}
        >
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="tax">Tax</SelectItem>
            <SelectItem value="discount">Discount</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <input
          type="number"
          value={editableValue.amount}
          onChange={(e) =>
            onChange("amount", parseFloat(e.target.value) || 0)
          }
          className="h-9 w-24 rounded-md border border-slate-200 bg-white px-2 text-right text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
        />
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={editableValue.isPercentage}
            onChange={(e) => onChange("isPercentage", e.target.checked)}
          />
          %
        </label>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  const typeBadge =
    item.type === "discount"
      ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
      : item.type === "tax"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        : item.type === "service"
          ? "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
        {item.name}
      </span>
      <span
        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${typeBadge}`}
      >
        {item.type}
      </span>
      <span
        className={`text-sm font-semibold ${
          item.type === "discount"
            ? "text-red-600 dark:text-red-400"
            : "text-slate-700 dark:text-slate-200"
        }`}
      >
        {item.type === "discount" ? "−" : "+"}
        {item.isPercentage ? `${item.amount}%` : INR(item.amount)}
      </span>
    </div>
  );
}
