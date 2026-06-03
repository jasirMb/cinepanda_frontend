"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { quotationsKeys, useQuotation } from "@/hooks/useQuotations";
import {
  updateQuotation,
  updateQuotationStatus,
  deleteQuotation,
  quotationProjectId,
  quotationItemImage,
  type Quotation,
} from "@/lib/api/quotations";
import { createProjectFromQuotation } from "@/lib/api/projects";
import { type SpeakerConfigSnapshot } from "@/lib/api/speaker-configs";
import { SpeakerConfigPicker } from "@/components/quotation/SpeakerConfigPicker";
import { downloadProposalPdf } from "@/lib/quotation-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { FolderKanban, Lock, Package } from "lucide-react";

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

const INR = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  APPROVED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

/* ────────────────────────────────────────────
   Page
   ──────────────────────────────────────────── */

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const quotationId = params.id as string;
  const quotationQuery = useQuotation(quotationId);
  const quotation = quotationQuery.data;

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [speakerConfig, setSpeakerConfig] =
    useState<SpeakerConfigSnapshot | null>(null);

  // Create-project-from-quotation form
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projServiceType, setProjServiceType] = useState("");
  const [projStart, setProjStart] = useState("");
  const [projEnd, setProjEnd] = useState("");
  // Which quotation option (section) to build the project from.
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);

  const createProjectMutation = useMutation({
    mutationFn: () =>
      createProjectFromQuotation(quotationId, {
        serviceType: projServiceType.trim(),
        startDate: projStart,
        expectedCompletionDate: projEnd,
        selectedSectionIndex,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created from quotation");
      const pid = res.data?._id;
      if (pid) router.push(`/projects/${pid}`);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error ?? "Failed to create project"),
  });

  function handleCreateProject() {
    if (!projServiceType.trim()) return toast.error("Service type is required");
    if (!projStart) return toast.error("Start date is required");
    if (!projEnd) return toast.error("Expected end date is required");
    createProjectMutation.mutate();
  }

  // Populate editable fields
  useEffect(() => {
    if (quotation) {
      setNotes(quotation.notes ?? "");
      setTermsAndConditions(quotation.termsAndConditions ?? "");
      setValidUntil(
        quotation.validUntil
          ? new Date(quotation.validUntil).toISOString().split("T")[0]
          : ""
      );
      setSpeakerConfig(quotation.speakerConfig ?? null);
    }
  }, [quotation]);

  const speakerConfigMutation = useMutation({
    mutationFn: (cfg: SpeakerConfigSnapshot | null) =>
      updateQuotation(quotationId, { speakerConfig: cfg }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
      queryClient.invalidateQueries({
        queryKey: quotationsKeys.detail(quotationId),
      });
      toast.success("Speaker configuration saved");
    },
    onError: (err) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error ?? "Failed to save configuration");
    },
  });

  // ── mutations ─────────────────────────────
  const updateMutation = useMutation({
    mutationFn: () =>
      updateQuotation(quotationId, {
        notes: notes.trim() || undefined,
        termsAndConditions: termsAndConditions.trim() || undefined,
        validUntil: validUntil || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
      queryClient.invalidateQueries({
        queryKey: quotationsKeys.detail(quotationId),
      });
      setIsEditing(false);
      toast.success("Quotation updated");
    },
    onError: (err) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error ?? "Failed to update quotation");
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: Quotation["status"]) =>
      updateQuotationStatus(quotationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
      queryClient.invalidateQueries({
        queryKey: quotationsKeys.detail(quotationId),
      });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteQuotation(quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
      router.push("/quotations");
    },
    onError: (err) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error ?? "Failed to delete quotation");
    },
  });

  async function handleDownloadPdf() {
    if (!quotation) return;
    setDownloadingPdf(true);
    try {
      await downloadProposalPdf(quotation);
    } catch (err) {
      console.error("Download proposal PDF failed:", err);
      toast.error("Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function handleCancel() {
    if (quotation) {
      setNotes(quotation.notes ?? "");
      setTermsAndConditions(quotation.termsAndConditions ?? "");
      setValidUntil(
        quotation.validUntil
          ? new Date(quotation.validUntil).toISOString().split("T")[0]
          : ""
      );
    }
    setIsEditing(false);
  }

  // ── loading / error ───────────────────────
  if (quotationQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (quotationQuery.isError || !quotation) {
    return (
      <div className="space-y-4">
        <p className="text-red-400">Failed to load quotation.</p>
        <Button variant="outline" asChild>
          <Link href="/quotations">Back to quotations</Link>
        </Button>
      </div>
    );
  }

  const customer = quotation.customerId;
  const statusColor = STATUS_COLORS[quotation.status] ?? STATUS_COLORS.DRAFT;
  const statusMap: Record<Quotation["status"], Quotation["status"][]> = {
    DRAFT: ["SENT"],
    SENT: ["APPROVED", "REJECTED"],
    APPROVED: [],
    REJECTED: [],
  };
  const nextStatuses = statusMap[quotation.status];
  // APPROVED / REJECTED quotations are final — no edit or delete.
  const locked =
    quotation.status === "APPROVED" || quotation.status === "REJECTED";

  // ── RENDER ────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Quotation for {customer.name}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColor}`}
            >
              {quotation.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {customer.place} · {customer.phone}
            {customer.email && ` · ${customer.email}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/quotations">Back</Link>
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? "Downloading..." : "Download PDF"}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/quotations/${quotationId}/preview`}>
              Preview PDF
            </Link>
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          ) : locked ? (
            <span
              title={`${quotation.status[0]}${quotation.status.slice(1).toLowerCase()} quotations can't be edited or deleted`}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
            >
              <Lock className="h-4 w-4" /> Locked
            </span>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status actions */}
      {nextStatuses.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Update status:
          </span>
          {nextStatuses.map((s) => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              onClick={() => statusMutation.mutate(s)}
              disabled={statusMutation.isPending}
            >
              Mark as {s}
            </Button>
          ))}
        </div>
      )}

      {/* Project from quotation */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Project
            </h3>
          </div>
          {quotation.projectId ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${quotationProjectId(quotation.projectId)}`}>
                View project
              </Link>
            </Button>
          ) : quotation.status === "APPROVED" ? (
            <Button size="sm" onClick={() => setShowProjectForm((v) => !v)}>
              {showProjectForm ? "Cancel" : "Create project"}
            </Button>
          ) : (
            <span className="text-xs text-slate-400">
              Mark the quotation as Approved to create a project.
            </span>
          )}
        </div>
        {showProjectForm && !quotation.projectId && quotation.status === "APPROVED" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {quotation.sections.length > 1 && (
              <div className="sm:col-span-3">
                <p className="mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Which option to build? *
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {quotation.sections.map((sec, si) => {
                    const active = selectedSectionIndex === si;
                    return (
                      <button
                        key={si}
                        type="button"
                        onClick={() => setSelectedSectionIndex(si)}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                          active
                            ? "border-cine-primary bg-cine-primary/5 dark:border-cine-primary dark:bg-cine-primary/10"
                            : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                              active
                                ? "border-cine-primary"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {active && (
                              <span className="h-2 w-2 rounded-full bg-cine-primary" />
                            )}
                          </span>
                          <span className="truncate text-slate-700 dark:text-slate-200">
                            Option {si + 1}: {sec.sectionName}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-emerald-700 dark:text-emerald-300">
                          {INR(sec.grandTotal)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Service type *
              <Input
                value={projServiceType}
                onChange={(e) => setProjServiceType(e.target.value)}
                placeholder="e.g. Home Cinema"
                className="mt-1"
              />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Start date *
              <div className="mt-1">
                <DatePicker value={projStart} onChange={setProjStart} placeholder="Start" />
              </div>
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Expected end *
              <div className="mt-1">
                <DatePicker value={projEnd} onChange={setProjEnd} placeholder="Expected end" />
              </div>
            </label>
            <div className="flex justify-end sm:col-span-3">
              <Button
                onClick={handleCreateProject}
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending ? "Creating…" : "Create project"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dates & editable fields */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">
              Quotation Date
            </p>
            <p className="text-sm text-slate-900 dark:text-slate-50">
              {new Date(quotation.quotationDate).toLocaleDateString("en-IN", {
                dateStyle: "long",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">
              Valid Until
            </p>
            {isEditing ? (
              <DatePicker
                value={validUntil}
                onChange={setValidUntil}
                placeholder="Select valid until date"
              />
            ) : (
              <p className="text-sm text-slate-900 dark:text-slate-50">
                {quotation.validUntil
                  ? new Date(quotation.validUntil).toLocaleDateString("en-IN", {
                      dateStyle: "long",
                    })
                  : "—"}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-slate-400">Notes</p>
          {isEditing ? (
            <textarea
              className="mt-1 min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          ) : (
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              {quotation.notes || "—"}
            </p>
          )}
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-slate-400">
            Terms & Conditions
          </p>
          {isEditing ? (
            <textarea
              className="mt-1 min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
            />
          ) : (
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">
              {quotation.termsAndConditions || "—"}
            </p>
          )}
        </div>
      </div>

      {/* Speaker configuration */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Speaker Configuration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Its diagram is shown in the quotation PDF.
            </p>
          </div>
          {!locked && (
            <Button
              size="sm"
              disabled={
                speakerConfigMutation.isPending ||
                JSON.stringify(speakerConfig) ===
                  JSON.stringify(quotation.speakerConfig ?? null)
              }
              onClick={() => speakerConfigMutation.mutate(speakerConfig)}
            >
              {speakerConfigMutation.isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
        {locked ? (
          <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
            {speakerConfig?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={speakerConfig.imageUrl}
                alt={speakerConfig.name}
                className="h-16 w-24 rounded border border-slate-200 object-contain dark:border-slate-700"
              />
            )}
            <span>{speakerConfig?.name ?? "None selected"}</span>
          </div>
        ) : (
          <SpeakerConfigPicker
            value={speakerConfig}
            onChange={setSpeakerConfig}
          />
        )}
      </div>

      {/* Sections (template options) — document style */}
      <div className="space-y-3">
        {quotation.sections.map((section, si) => (
          <div
            key={si}
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
          >
            {/* Section header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/30">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
                  Option {si + 1}: {section.sectionName}
                </h3>
                {section.description && (
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {section.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-base font-bold text-emerald-700 dark:text-emerald-400">
                {INR(section.grandTotal)}
              </span>
            </div>

            {/* Groups */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {section.groups.map((group, gi) => (
                <div key={gi} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {group.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Subtotal: {INR(group.subtotal)}
                    </p>
                  </div>

                  {/* Products table */}
                  <div className="-mx-4 mt-1.5 overflow-x-auto px-4">
                    <table className="w-full min-w-[480px] table-fixed text-sm">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                          <th className="w-8 py-1 font-medium">#</th>
                          <th className="py-1 font-medium">Product</th>
                          <th className="w-14 py-1 text-center font-medium">
                            Qty
                          </th>
                          <th className="w-28 py-1 text-right font-medium">
                            Unit Price
                          </th>
                          <th className="w-28 py-1 text-right font-medium">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700 dark:text-slate-300">
                        {group.productItems.map((item, ii) => {
                          const img = quotationItemImage(item.productId);
                          return (
                          <tr key={ii}>
                            <td className="py-1 text-slate-400">{ii + 1}</td>
                            <td className="py-1 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                                  {img ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={img}
                                      alt={item.productName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <Package className="h-4 w-4 text-slate-400" />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate">{item.productName}</p>
                                  <p className="truncate text-[10px] text-slate-400">
                                    {item.category} / {item.subcategory}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-1 text-center tabular-nums">
                              {item.quantity}
                            </td>
                            <td className="py-1 text-right tabular-nums">
                              {INR(item.unitPrice)}
                            </td>
                            <td className="py-1 text-right font-medium tabular-nums">
                              {INR(item.lineTotal)}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Group-level manual items */}
                  {group.manualItems.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-dashed border-slate-100 pt-2 dark:border-slate-800">
                      {group.manualItems.map((m, mi) => (
                        <div
                          key={mi}
                          className="flex justify-between text-xs text-slate-500 dark:text-slate-400"
                        >
                          <span>
                            {m.type === "discount" ? "−" : "+"} {m.name}
                            {m.isPercentage ? ` (${m.amount}%)` : ""}
                          </span>
                          <span
                            className={
                              m.type === "discount"
                                ? "text-red-500"
                                : "text-slate-600 dark:text-slate-300"
                            }
                          >
                            {m.type === "discount" ? "−" : "+"}
                            {INR(Math.abs(m.resolvedAmount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Section-level manual items (GST, discounts, etc.) */}
            {section.manualItems?.length > 0 && (
              <div className="border-t border-slate-200 px-4 py-2.5 dark:border-slate-800">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Adjustments
                </p>
                <div className="space-y-1">
                  {section.manualItems.map((m, mi) => (
                    <div
                      key={mi}
                      className="flex justify-between text-sm text-slate-600 dark:text-slate-300"
                    >
                      <span>
                        {m.type === "discount" ? "−" : "+"} {m.name}
                        {m.isPercentage ? ` (${m.amount}%)` : ""}
                      </span>
                      <span
                        className={
                          m.type === "discount"
                            ? "font-medium text-red-500"
                            : "font-medium text-slate-700 dark:text-slate-200"
                        }
                      >
                        {m.type === "discount" ? "−" : "+"}
                        {INR(Math.abs(m.resolvedAmount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Created: {new Date(quotation.createdAt).toLocaleString()}
        </span>
        <span>
          Updated: {new Date(quotation.updatedAt).toLocaleString()}
        </span>
        <span>ID: {quotation._id}</span>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={(open) => { if (!open) setShowDeleteDialog(false); }}
        title="Delete quotation"
        description="Are you sure you want to delete this quotation? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          deleteMutation.mutate();
          setShowDeleteDialog(false);
        }}
      />

    </div>
  );
}
