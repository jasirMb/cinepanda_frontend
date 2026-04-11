"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const INR = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

/* ────────────────────────────────────────────
   Editable product item (local state)
   ──────────────────────────────────────────── */

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

/* ────────────────────────────────────────────
   Page
   ──────────────────────────────────────────── */

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const templateId = params.id as string;

  const templateQuery = useTemplate(templateId);
  const template = templateQuery.data;

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Editable form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groups, setGroups] = useState<EditableGroup[]>([]);
  const [manualItems, setManualItems] = useState<TemplateManualItem[]>([]);

  // Populate form when template loads
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

  // Computed totals from editable state
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

  // ── mutations ─────────────────────────────
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
    onError: () => {
      toast.error("Failed to update template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKeys.all });
      router.push("/templates");
    },
    onError: () => {
      toast.error("Failed to delete template");
    },
  });

  // ── edit helpers ──────────────────────────
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

  function handleDelete() {
    setShowDeleteDialog(true);
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
                j === pi ? { ...p, [field]: Math.max(field === "quantity" ? 1 : 0, value) } : p
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

  // ── loading / error states ────────────────
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
          <Link href="/templates">Back to templates</Link>
        </Button>
      </div>
    );
  }

  // ── RENDER ────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg font-semibold"
                placeholder="Template name"
              />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
              />
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                {template.name}
              </h2>
              {template.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {template.description}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/templates">Back</Link>
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grand total banner */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Grand Total
        </span>
        <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
          {INR(isEditing ? grandTotal : template.grandTotal)}
        </span>
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
              {/* Group header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {group.productItems.length} product
                    {group.productItems.length !== 1 ? "s" : ""} · Subtotal:{" "}
                    {INR(subtotal)}
                  </p>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => removeGroup(gi)}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                  >
                    Remove Group
                  </button>
                )}
              </div>

              {/* Product items */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.productItems.map((item, pi) => (
                  <div
                    key={pi}
                    className="flex flex-wrap items-center gap-4 px-6 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.category} / {item.subcategory}
                      </p>
                    </div>

                    {isEditing ? (
                      <>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-slate-500">Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={(group as EditableGroup).productItems[pi].quantity}
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
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-slate-500">Price</label>
                          <input
                            type="number"
                            min={0}
                            value={(group as EditableGroup).productItems[pi].unitPrice}
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
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProduct(gi, pi)}
                          className="text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          x{item.quantity}
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

              {/* Group manual items */}
              {group.manualItems.length > 0 && (
                <div className="border-t border-dashed border-slate-200 dark:border-slate-700">
                  <div className="px-6 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Group adjustments
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100 px-6 pb-3 dark:divide-slate-800">
                    {group.manualItems.map((m, mi) => (
                      <div
                        key={mi}
                        className="flex items-center gap-3 py-2"
                      >
                        {isEditing ? (
                          <>
                            <Input
                              value={(group as EditableGroup).manualItems[mi].name}
                              onChange={(e) =>
                                updateManualItem(gi, mi, "name", e.target.value)
                              }
                              placeholder="Name"
                              className="flex-1"
                            />
                            <Select value={(group as EditableGroup).manualItems[mi].type} onValueChange={(v) => updateManualItem(gi, mi, "type", v)}>
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
                              value={(group as EditableGroup).manualItems[mi].amount}
                              onChange={(e) =>
                                updateManualItem(
                                  gi,
                                  mi,
                                  "amount",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-right text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                            />
                            <label className="flex items-center gap-1 text-xs text-slate-500">
                              <input
                                type="checkbox"
                                checked={
                                  (group as EditableGroup).manualItems[mi]
                                    .isPercentage
                                }
                                onChange={(e) =>
                                  updateManualItem(
                                    gi,
                                    mi,
                                    "isPercentage",
                                    e.target.checked
                                  )
                                }
                              />
                              %
                            </label>
                            <button
                              type="button"
                              onClick={() => removeGroupManualItem(gi, mi)}
                              className="text-xs text-red-500"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                              {m.name}
                            </span>
                            <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800 dark:text-slate-300">
                              {m.type}
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                m.type === "discount"
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {m.type === "discount" ? "-" : "+"}
                              {m.isPercentage ? `${m.amount}%` : INR(m.amount)}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Template-level manual items */}
      {(isEditing ? manualItems : template.manualItems).length > 0 || isEditing ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Template Adjustments (GST, Discounts, etc.)
            </h3>
            {isEditing && (
              <button
                type="button"
                onClick={addTemplateManualItem}
                className="text-xs font-medium text-cine-primary hover:underline"
              >
                + Add Adjustment
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100 px-6 dark:divide-slate-800">
            {(isEditing ? manualItems : template.manualItems).map((m, mi) => (
              <div key={mi} className="flex items-center gap-3 py-3">
                {isEditing ? (
                  <>
                    <Input
                      value={manualItems[mi].name}
                      onChange={(e) =>
                        updateTemplateManualItem(mi, "name", e.target.value)
                      }
                      placeholder="e.g. GST 18%"
                      className="flex-1"
                    />
                    <Select value={manualItems[mi].type} onValueChange={(v) => updateTemplateManualItem(mi, "type", v)}>
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
                      value={manualItems[mi].amount}
                      onChange={(e) =>
                        updateTemplateManualItem(
                          mi,
                          "amount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-right text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    />
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={manualItems[mi].isPercentage}
                        onChange={(e) =>
                          updateTemplateManualItem(
                            mi,
                            "isPercentage",
                            e.target.checked
                          )
                        }
                      />
                      %
                    </label>
                    <button
                      type="button"
                      onClick={() => removeTemplateManualItem(mi)}
                      className="text-xs text-red-500"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                      {m.name}
                    </span>
                    <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800 dark:text-slate-300">
                      {m.type}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        m.type === "discount"
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {m.type === "discount" ? "-" : "+"}
                      {m.isPercentage ? `${m.amount}%` : INR(m.amount)}
                    </span>
                  </>
                )}
              </div>
            ))}
            {!isEditing && template.manualItems.length === 0 && (
              <p className="py-3 text-xs text-slate-500 dark:text-slate-400">
                No template-level adjustments.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span>Created: {new Date(template.createdAt).toLocaleString()}</span>
        <span>Updated: {new Date(template.updatedAt).toLocaleString()}</span>
        <span>ID: {template._id}</span>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={(open) => { if (!open) setShowDeleteDialog(false); }}
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
