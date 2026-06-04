"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Lock,
  FolderKanban,
  CheckCircle2,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Phone,
  MapPin,
  Package,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { quotationsKeys, useQuotations } from "@/hooks/useQuotations";
import { useTemplates } from "@/hooks/useTemplates";
import { productItemImage, type Template } from "@/lib/api/templates";
import { type SpeakerConfigSnapshot } from "@/lib/api/speaker-configs";
import { SpeakerConfigPicker } from "@/components/quotation/SpeakerConfigPicker";
import { useCustomers } from "@/hooks/useCustomers";
import {
  createQuotation,
  deleteQuotation,
  updateQuotationStatus,
  quotationProject,
  quotationProjectId,
  type CreateQuotationPayload,
  type Quotation,
} from "@/lib/api/quotations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

type Step = "list" | "templates" | "customer" | "details" | "preview" | "creating";

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

// Status-tinted header background — quick visual scan of approved / rejected / etc.
const HEADER_TINT: Record<string, string> = {
  DRAFT: "bg-slate-50 dark:bg-slate-800/40",
  SENT: "bg-blue-50/70 dark:bg-blue-950/20",
  APPROVED: "bg-emerald-50/70 dark:bg-emerald-950/20",
  REJECTED: "bg-red-50/70 dark:bg-red-950/20",
};

const CARD_GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
];
function gradientFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return CARD_GRADIENTS[Math.abs(h) % CARD_GRADIENTS.length];
}
function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/* ────────────────────────────────────────────
   Page
   ──────────────────────────────────────────── */

export default function QuotationsPage() {
  const queryClient = useQueryClient();

  const quotationsQuery = useQuotations();
  // Template picker: 10 per page, latest-first, searchable by name (debounced).
  const [templateSearch, setTemplateSearch] = useState("");
  const [debouncedTemplateSearch, setDebouncedTemplateSearch] = useState("");
  const [templatePage, setTemplatePage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTemplateSearch(templateSearch), 300);
    return () => clearTimeout(t);
  }, [templateSearch]);
  useEffect(() => {
    setTemplatePage(1);
  }, [debouncedTemplateSearch]);
  const templatesQuery = useTemplates({
    search: debouncedTemplateSearch || undefined,
    page: templatePage,
    limit: 10,
  });
  const customersQuery = useCustomers();

  const quotations = quotationsQuery.data?.data ?? [];
  const templates = templatesQuery.data?.data ?? [];
  const templatePagination = templatesQuery.data?.pagination;
  const customers = customersQuery.data?.data ?? [];

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [whatsappTarget, setWhatsappTarget] = useState<
    { phone: string; name: string } | null
  > (null);

  // ── list filters / pagination ─────────────
  type StatusFilter = "ALL" | Quotation["status"];
  type SortOption =
    | "createdAt_desc"
    | "createdAt_asc"
    | "quotationDate_desc"
    | "quotationDate_asc"
    | "amount_desc"
    | "amount_asc";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("createdAt_desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy]);

  const filteredQuotations = useMemo(() => {
    const q = search.trim().toLowerCase();
    const grandTotal = (qt: Quotation) =>
      qt.sections.reduce((s, sec) => s + sec.grandTotal, 0);

    let list = quotations;
    if (statusFilter !== "ALL") {
      list = list.filter((x) => x.status === statusFilter);
    }
    if (q) {
      list = list.filter((x) => {
        const c = x.customerId;
        return (
          (c?.name ?? "").toLowerCase().includes(q) ||
          (c?.place ?? "").toLowerCase().includes(q) ||
          (c?.phone ?? "").toLowerCase().includes(q)
        );
      });
    }

    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "createdAt_asc":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "createdAt_desc":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "quotationDate_asc":
          return (
            new Date(a.quotationDate).getTime() -
            new Date(b.quotationDate).getTime()
          );
        case "quotationDate_desc":
          return (
            new Date(b.quotationDate).getTime() -
            new Date(a.quotationDate).getTime()
          );
        case "amount_asc":
          return grandTotal(a) - grandTotal(b);
        case "amount_desc":
          return grandTotal(b) - grandTotal(a);
        default:
          return 0;
      }
    });
    return sorted;
  }, [quotations, search, statusFilter, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredQuotations.length / PAGE_SIZE)
  );
  const currentPage = Math.min(page, totalPages);
  const pagedQuotations = filteredQuotations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ── wizard state ──────────────────────────
  const [step, setStep] = useState<Step>("list");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  // Full objects of selected templates, so a pick survives search/pagination.
  const [selectedTemplatesById, setSelectedTemplatesById] = useState<
    Record<string, Template>
  >({});
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState(
    "50% advance required. Balance before delivery."
  );
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [validUntil, setValidUntil] = useState("");
  const [speakerConfig, setSpeakerConfig] =
    useState<SpeakerConfigSnapshot | null>(null);

  // Derived
  const selectedTemplates = useMemo(
    () =>
      selectedTemplateIds
        .map((id) => selectedTemplatesById[id])
        .filter(Boolean) as Template[],
    [selectedTemplateIds, selectedTemplatesById]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.place.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // ── mutations ─────────────────────────────
  const createMutation = useMutation({
    mutationFn: createQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
      resetWizard();
      toast.success("Quotation created successfully");
    },
    onError: () => {
      setStep("preview");
      toast.error("Failed to create quotation");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
      toast.success("Quotation deleted");
    },
    onError: (err) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error ?? "Failed to delete quotation");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Quotation["status"] }) =>
      updateQuotationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  // ── wizard helpers ────────────────────────
  function resetWizard() {
    setStep("list");
    setSelectedTemplateIds([]);
    setSelectedTemplatesById({});
    setTemplateSearch("");
    setDebouncedTemplateSearch("");
    setTemplatePage(1);
    setSelectedCustomerId("");
    setCustomerSearch("");
    setNotes("");
    setTermsAndConditions("50% advance required. Balance before delivery.");
    setQuotationDate(new Date().toISOString().split("T")[0]);
    setValidUntil("");
    setSpeakerConfig(null);
  }

  function toggleTemplate(tpl: Template) {
    setSelectedTemplateIds((prev) =>
      prev.includes(tpl._id)
        ? prev.filter((t) => t !== tpl._id)
        : [...prev, tpl._id]
    );
    setSelectedTemplatesById((prev) => {
      if (prev[tpl._id]) {
        const next = { ...prev };
        delete next[tpl._id];
        return next;
      }
      return { ...prev, [tpl._id]: tpl };
    });
  }

  function handleCreate() {
    const payload: CreateQuotationPayload = {
      customerId: selectedCustomerId,
      templateIds: selectedTemplateIds,
      notes: notes.trim() || undefined,
      termsAndConditions: termsAndConditions.trim() || undefined,
      quotationDate,
      validUntil: validUntil || undefined,
      speakerConfig: speakerConfig ?? undefined,
    };
    setStep("creating");
    createMutation.mutate(payload);
  }

  function handleDelete(id: string) {
    setDeleteTarget(id);
  }

  // ── loading / error ───────────────────────
  if (quotationsQuery.isLoading) {
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
  if (quotationsQuery.isError) {
    return <p className="text-red-400">Failed to load quotations.</p>;
  }

  // ── WIZARD STEPS ──────────────────────────

  // Step 1: Select templates
  if (step === "templates") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Create Quotation
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Step 1 of 3 — Select one or more templates as options for the
            customer
          </p>
        </div>

        {/* Selected templates — persist even while searching */}
        {selectedTemplates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-cine-primary/30 bg-cine-primary/5 p-3 dark:border-cine-primary/40 dark:bg-cine-primary/10">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Selected ({selectedTemplates.length}):
            </span>
            {selectedTemplates.map((tpl, i) => (
              <button
                key={tpl._id}
                type="button"
                onClick={() => toggleTemplate(tpl)}
                className="inline-flex items-center gap-1 rounded-full border border-cine-primary/30 bg-white px-2.5 py-1 text-xs font-medium text-cine-primary transition hover:bg-cine-primary/10 dark:bg-slate-900"
              >
                Option {i + 1}: {tpl.name}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        {/* Search — latest templates shown first; type to find any */}
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search templates by name…"
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {templatesQuery.isLoading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading templates...
          </p>
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {debouncedTemplateSearch ? (
                `No templates match “${debouncedTemplateSearch}”.`
              ) : (
                <>
                  No templates available.{" "}
                  <Link href="/templates" className="text-cine-primary underline">
                    Create a template first
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map((tpl) => {
                const isSelected = selectedTemplateIds.includes(tpl._id);
                const totalProducts = tpl.groups.reduce(
                  (s, g) => s + g.productItems.length,
                  0
                );
                return (
                  <button
                    key={tpl._id}
                    type="button"
                    onClick={() => toggleTemplate(tpl)}
                    className={`group flex flex-col gap-2 rounded-xl border bg-white p-3 text-left shadow-sm transition hover:shadow-md dark:bg-slate-900/60 ${
                      isSelected
                        ? "border-cine-primary ring-2 ring-cine-primary/30 dark:border-cine-primary"
                        : "border-slate-200 hover:border-cine-primary/40 dark:border-slate-800 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-xs font-bold text-white shadow-sm ${gradientFor(
                          tpl._id
                        )}`}
                      >
                        {tpl.name.trim().charAt(0).toUpperCase() || "T"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {tpl.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {tpl.description ||
                            `${totalProducts} item${totalProducts !== 1 ? "s" : ""} · ${tpl.groups.length} grp`}
                        </p>
                      </div>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          isSelected
                            ? "border-cine-primary bg-cine-primary text-white"
                            : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline justify-between">
                      <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                        {INR(tpl.grandTotal)}
                      </p>
                      {isSelected && (
                        <span className="text-[11px] font-semibold text-cine-primary">
                          Option {selectedTemplateIds.indexOf(tpl._id) + 1}
                        </span>
                      )}
                    </div>

                    {/* Group chips */}
                    {tpl.groups.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tpl.groups.slice(0, 3).map((g) => (
                          <span
                            key={g.name}
                            className="truncate rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                          >
                            {g.name}
                          </span>
                        ))}
                        {tpl.groups.length > 3 && (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500">
                            +{tpl.groups.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {templatePagination && templatePagination.totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {templates.length} of {templatePagination.total} · page{" "}
                  {templatePagination.page} of {templatePagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!templatePagination.hasPrev}
                    onClick={() => setTemplatePage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!templatePagination.hasNext}
                    onClick={() => setTemplatePage((p) => p + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={resetWizard}>
            Cancel
          </Button>
          <Button
            disabled={selectedTemplateIds.length === 0}
            onClick={() => setStep("customer")}
          >
            Next — Select Customer
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Select customer
  if (step === "customer") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Select Customer
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Step 2 of 3 — Choose who this quotation is for
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, phone, or place..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {customersQuery.isLoading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading customers...
          </p>
        ) : filteredCustomers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
            No customers found.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredCustomers.map((cust) => {
              const isSelected = selectedCustomerId === cust._id;
              return (
                <button
                  key={cust._id}
                  type="button"
                  onClick={() => setSelectedCustomerId(cust._id)}
                  className={`group flex h-full items-start gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900/60 ${
                    isSelected
                      ? "border-cine-primary ring-2 ring-cine-primary/30 dark:border-cine-primary"
                      : "border-slate-200 hover:border-cine-primary/40 dark:border-slate-800 dark:hover:border-slate-700"
                  }`}
                >
                  {cust.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cust.imageUrl}
                      alt={cust.name}
                      className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                    />
                  ) : (
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm ${gradientFor(
                        cust._id
                      )}`}
                    >
                      {getInitials(cust.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
                      {cust.name}
                    </p>
                    <div className="mt-1.5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{cust.phone}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{cust.place}</span>
                      </p>
                    </div>
                  </div>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      isSelected
                        ? "border-cine-primary bg-cine-primary text-white"
                        : "border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep("templates")}>
            Back
          </Button>
          <Button
            disabled={!selectedCustomerId}
            onClick={() => setStep("details")}
          >
            Next — Add Details
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Notes, T&C, dates
  if (step === "details") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Quotation Details
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Step 3 of 3 — Add notes, terms, speaker configuration & dates
          </p>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Quotation Date
            </label>
            <DatePicker
              value={quotationDate}
              onChange={setQuotationDate}
              placeholder="Select quotation date"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Valid Until
            </label>
            <DatePicker
              value={validUntil}
              onChange={setValidUntil}
              placeholder="Select valid until date"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Notes
            </label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="e.g. Site visit done on 10 Mar. Room is 15×12 ft."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Terms & Conditions
            </label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Speaker Configuration
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              Pick a configuration — its diagram appears in the PDF. Add a new
              one with “Add configuration”.
            </p>
            <SpeakerConfigPicker
              value={speakerConfig}
              onChange={setSpeakerConfig}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep("customer")}>
            Back
          </Button>
          <Button onClick={() => setStep("preview")}>Preview Quotation</Button>
        </div>
      </div>
    );
  }

  // Preview — looks like a document you'd send to a customer
  if (step === "preview") {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Preview Quotation
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Review before sending to the customer
            </p>
          </div>
        </div>

        {/* Document-style preview */}
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900/80">
          {/* Header */}
          <div className="border-b border-slate-200 px-8 py-6 text-center dark:border-slate-800">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Cinepanda — Quotation
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Date: {new Date(quotationDate).toLocaleDateString("en-IN", { dateStyle: "long" })}
              {validUntil &&
                ` · Valid Until: ${new Date(validUntil).toLocaleDateString("en-IN", { dateStyle: "long" })}`}
            </p>
          </div>

          {/* Customer */}
          <div className="border-b border-slate-200 px-8 py-4 dark:border-slate-800">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Customer
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {selectedCustomer?.name}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {selectedCustomer?.place} · {selectedCustomer?.phone}
            </p>
            {notes && (
              <p className="mt-1 text-sm italic text-slate-500 dark:text-slate-400">
                {notes}
              </p>
            )}
          </div>

          {/* Options (each template = 1 option) */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {selectedTemplates.map((tpl, si) => (
              <div key={tpl._id} className="px-8 py-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                  Option {si + 1}: {tpl.name}
                </h3>
                {tpl.description && (
                  <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                    {tpl.description}
                  </p>
                )}

                {tpl.groups.map((group) => (
                  <div key={group.name} className="mb-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {group.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Subtotal: {INR(group.subtotal)}
                      </p>
                    </div>
                    <table className="mt-1 w-full table-fixed text-sm">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                          <th className="py-1 font-medium">Item</th>
                          <th className="w-16 py-1 text-center font-medium">
                            Qty
                          </th>
                          <th className="w-32 py-1 text-right font-medium">
                            Unit Price
                          </th>
                          <th className="w-32 py-1 text-right font-medium">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700 dark:text-slate-300">
                        {group.productItems.map((item, i) => {
                          const img = productItemImage(item.productId);
                          return (
                          <tr key={i}>
                            <td className="py-1 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                                  {img ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={img}
                                      alt={item.productName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <Package className="h-3.5 w-3.5 text-slate-400" />
                                  )}
                                </span>
                                <span className="truncate">
                                  {item.productName}
                                </span>
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

                    {/* Group-level manual items */}
                    {group.manualItems.length > 0 && (
                      <div className="mt-1 space-y-0.5 rounded bg-slate-50 p-2 text-xs dark:bg-slate-800/40">
                        {group.manualItems.map((m, mi) => (
                          <div key={mi} className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>
                              {m.type === "discount" ? "−" : "+"} {m.name}
                              {m.isPercentage ? ` (${m.amount}%)` : ""}
                            </span>
                            <span className={m.type === "discount" ? "text-red-500" : ""}>
                              {m.type === "discount" ? "−" : "+"}{INR(m.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Template-level adjustments (GST, discounts, etc.) */}
                {tpl.manualItems.length > 0 && (
                  <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Adjustments
                    </p>
                    {tpl.manualItems.map((m, mi) => (
                      <div key={mi} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                        <span>
                          {m.type === "discount" ? "−" : "+"} {m.name}
                          {m.isPercentage ? ` (${m.amount}%)` : ""}
                        </span>
                        <span className={`font-medium ${m.type === "discount" ? "text-red-500" : ""}`}>
                          {m.type === "discount" ? "−" : "+"}
                          {m.isPercentage ? `${m.amount}%` : INR(m.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end border-t border-slate-100 pt-2 dark:border-slate-700">
                  <p className="text-base font-bold text-slate-900 dark:text-slate-50">
                    Option {si + 1} Total: {INR(tpl.grandTotal)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* T&C */}
          {termsAndConditions && (
            <div className="border-t border-slate-200 px-8 py-4 dark:border-slate-800">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Terms & Conditions
              </p>
              <p className="mt-1 whitespace-pre-line text-xs text-slate-600 dark:text-slate-400">
                {termsAndConditions}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep("details")}>
            Back
          </Button>
          <Button onClick={handleCreate}>
            Confirm & Create Quotation
          </Button>
        </div>
      </div>
    );
  }

  // Creating state
  if (step === "creating") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-700 dark:text-slate-300">
          Creating quotation...
        </p>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Quotations
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Manage quotations and pricing for Cinepanda projects.
          </p>
        </div>
        <Button onClick={() => setStep("templates")}>
          Create Quotation
        </Button>
      </div>

      {/* Filter bar */}
      {quotations.length > 0 && (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2 md:grid-cols-4">
          <Input
            placeholder="Search customer, place, phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt_desc">Created (newest)</SelectItem>
              <SelectItem value="createdAt_asc">Created (oldest)</SelectItem>
              <SelectItem value="quotationDate_desc">
                Quotation date (newest)
              </SelectItem>
              <SelectItem value="quotationDate_asc">
                Quotation date (oldest)
              </SelectItem>
              <SelectItem value="amount_desc">Amount (highest)</SelectItem>
              <SelectItem value="amount_asc">Amount (lowest)</SelectItem>
            </SelectContent>
          </Select>
          {(search || statusFilter !== "ALL" || sortBy !== "createdAt_desc") && (
            <Button
              variant="outline"
              size="sm"
              className="md:col-span-4 md:justify-self-end"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setSortBy("createdAt_desc");
              }}
            >
              Reset filters
            </Button>
          )}
        </div>
      )}

      {/* Results info */}
      {quotations.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <p>
            Showing {pagedQuotations.length} of {filteredQuotations.length}
            {filteredQuotations.length !== quotations.length &&
              ` (filtered from ${quotations.length})`}
            {totalPages > 1 && ` · page ${currentPage} of ${totalPages}`}
          </p>
        </div>
      )}

      {/* Quotation cards */}
      {quotations.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No quotations yet. Create one from your templates.
          </p>
        </div>
      ) : pagedQuotations.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No quotations match your filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pagedQuotations.map((q) => (
            <QuotationCard
              key={q._id}
              quotation={q}
              onDelete={handleDelete}
              onStatusChange={(id, status) =>
                statusMutation.mutate({ id, status })
              }
              onWhatsapp={(phone, name) =>
                setWhatsappTarget({ phone, name })
              }
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete quotation"
        description="Are you sure you want to delete this quotation? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />

      <ConfirmDialog
        open={whatsappTarget !== null}
        onOpenChange={(open) => {
          if (!open) setWhatsappTarget(null);
        }}
        title="Open WhatsApp?"
        description={
          whatsappTarget
            ? `Send a WhatsApp message to ${whatsappTarget.name} (${whatsappTarget.phone})? WhatsApp will open with a pre-filled message that you can edit before sending.`
            : ""
        }
        confirmLabel="Open WhatsApp"
        variant="default"
        onConfirm={() => {
          if (whatsappTarget) {
            const url = buildWhatsappUrl(
              whatsappTarget.phone,
              defaultWhatsappMessage(whatsappTarget.name)
            );
            window.open(url, "_blank", "noopener,noreferrer");
          }
          setWhatsappTarget(null);
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────
   WhatsApp helpers
   ──────────────────────────────────────────── */

function buildWhatsappUrl(phone: string, message: string): string {
  // wa.me works across WhatsApp Web (macOS/Windows browser), desktop apps,
  // Android and iOS — it picks the right target based on the platform.
  const digits = phone.replace(/\D/g, "");
  // Fall back to India country code for 10-digit local numbers (project default).
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function defaultWhatsappMessage(customerName: string): string {
  const firstName = customerName.trim().split(/\s+/)[0] || "there";
  return `Hi ${firstName}, this is regarding your quotation from Cinepanda. Please let me know if you have any questions.`;
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M19.11 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.44-9.91 9.9 0 1.74.46 3.44 1.33 4.95L2 22l5.29-1.39a9.93 9.93 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.85-6.99ZM12.04 20.13h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.23 8.23 0 0 1-1.26-4.35c0-4.54 3.7-8.24 8.27-8.24 2.2 0 4.28.86 5.84 2.42a8.19 8.19 0 0 1 2.42 5.83c-.01 4.55-3.7 8.22-8.26 8.22Zm4.53-6.16c-.25-.12-1.47-.72-1.69-.8-.23-.08-.39-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.83-.2-.48-.4-.41-.56-.42-.14-.01-.31-.01-.48-.01a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.53.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.17-.47-.29Z" />
    </svg>
  );
}

/* ────────────────────────────────────────────
   Quotation Card
   ──────────────────────────────────────────── */

function QuotationCard({
  quotation,
  onDelete,
  onStatusChange,
  onWhatsapp,
}: {
  quotation: Quotation;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Quotation["status"]) => void;
  onWhatsapp: (phone: string, name: string) => void;
}) {
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
  const initial = quotation.customerId.name.trim().charAt(0).toUpperCase() || "?";
  const pid = quotationProjectId(quotation.projectId);
  const proj = quotationProject(quotation.projectId);

  const highest = Math.max(...quotation.sections.map((s) => s.grandTotal), 0);

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60">
      {/* Status-tinted header */}
      <div
        className={`flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 ${HEADER_TINT[quotation.status] ?? ""}`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-base font-bold text-white shadow-sm ${gradientFor(
            quotation.customerId._id
          )}`}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/quotations/${quotation._id}`}
            className="block truncate text-base font-semibold text-slate-900 group-hover:text-cine-primary dark:text-slate-50"
          >
            {quotation.customerId.name}
          </Link>
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <span className="truncate">
              {quotation.customerId.place} · {quotation.customerId.phone}
            </span>
            {quotation.customerId.phone && (
              <button
                type="button"
                onClick={() =>
                  onWhatsapp(
                    quotation.customerId.phone,
                    quotation.customerId.name
                  )
                }
                aria-label={`Send WhatsApp message to ${quotation.customerId.name}`}
                title="Send WhatsApp message"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
              >
                <WhatsappIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusColor}`}
        >
          {quotation.status}
        </span>
      </div>

      {/* Options as a priced list */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={`/quotations/${quotation._id}`} className="block">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {quotation.sections.length} option
            {quotation.sections.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-1">
            {quotation.sections.map((sec, i) => {
              const top =
                quotation.sections.length > 1 && sec.grandTotal === highest;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        top ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                    <span className="truncate text-slate-600 dark:text-slate-300">
                      Option {i + 1}: {sec.sectionName}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-slate-800 dark:text-slate-100">
                    {INR(sec.grandTotal)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            {new Date(quotation.quotationDate).toLocaleDateString()}
            {quotation.validUntil &&
              ` · valid until ${new Date(quotation.validUntil).toLocaleDateString()}`}
          </p>
        </Link>

        {/* Project state */}
        {pid ? (
          <Link
            href={`/projects/${pid}`}
            className="mt-auto flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="min-w-0 truncate font-medium text-emerald-800 dark:text-emerald-300">
              Project: {proj?.clientName ?? "view"}
              {proj?.status ? ` · ${proj.status}` : ""}
            </span>
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
          </Link>
        ) : quotation.status === "APPROVED" ? (
          <Link
            href={`/quotations/${quotation._id}`}
            className="mt-auto flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
          >
            <Plus className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-800 dark:text-amber-300">
              No project yet
            </span>
            <span className="ml-auto font-semibold text-amber-700 dark:text-amber-400">
              Create →
            </span>
          </Link>
        ) : null}
      </div>

      {/* Footer bar */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-800/30">
        <Link
          href={`/quotations/${quotation._id}`}
          className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 font-medium text-slate-700 transition hover:border-cine-primary hover:text-cine-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          View
        </Link>

        {nextStatuses.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStatusChange(quotation._id, s)}
            className="inline-flex h-8 items-center rounded-md border border-cine-primary/30 bg-cine-primary/5 px-3 font-medium text-cine-primary transition hover:bg-cine-primary/10 dark:border-cine-primary/40 dark:bg-cine-primary/10"
          >
            Mark {s}
          </button>
        ))}

        {locked ? (
          <span
            title={`${quotation.status[0]}${quotation.status.slice(1).toLowerCase()} quotations can't be edited or deleted`}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-3 font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
          >
            <Lock className="h-3 w-3" /> Locked
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onDelete(quotation._id)}
            className="ml-auto inline-flex h-8 items-center rounded-md border border-red-200 bg-white px-3 font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:bg-slate-900 dark:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
