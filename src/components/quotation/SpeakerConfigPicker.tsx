"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ImagePlus, Loader2, Plus, Speaker, Trash2 } from "lucide-react";

import {
  fetchSpeakerConfigs,
  createSpeakerConfig,
  deleteSpeakerConfig,
  type SpeakerConfigSnapshot,
} from "@/lib/api/speaker-configs";
import { uploadFile } from "@/lib/api/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SpeakerConfigPicker({
  value,
  onChange,
}: {
  value?: SpeakerConfigSnapshot | null;
  onChange: (config: SpeakerConfigSnapshot | null) => void;
}) {
  const qc = useQueryClient();
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["speaker-configs"],
    queryFn: fetchSpeakerConfigs,
    staleTime: 60_000,
  });

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createM = useMutation({
    mutationFn: () =>
      createSpeakerConfig({
        name: name.trim(),
        imageUrl: imageUrl || undefined,
        imageKey: imageKey || undefined,
      }),
    onSuccess: (cfg) => {
      qc.invalidateQueries({ queryKey: ["speaker-configs"] });
      onChange({ name: cfg.name, imageUrl: cfg.imageUrl, imageKey: cfg.imageKey });
      setAdding(false);
      setName("");
      setImageUrl("");
      setImageKey("");
      toast.success("Configuration added");
    },
    onError: () => toast.error("Failed to add configuration"),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteSpeakerConfig(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["speaker-configs"] }),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const up = await uploadFile(f, "misc");
      setImageUrl(up.fileUrl);
      setImageKey(up.key);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const tileBase =
    "relative flex h-full flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition";

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {/* None */}
          <button
            type="button"
            onClick={() => onChange(null)}
            className={`${tileBase} ${
              !value
                ? "border-cine-primary ring-2 ring-cine-primary/30"
                : "border-slate-200 hover:border-cine-primary/40 dark:border-slate-700"
            }`}
          >
            <div className="flex h-16 w-full items-center justify-center rounded bg-slate-50 text-slate-300 dark:bg-slate-800">
              <Speaker className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              None
            </span>
          </button>

          {configs.map((cfg) => {
            const selected = value?.name === cfg.name;
            return (
              <button
                key={cfg._id}
                type="button"
                onClick={() =>
                  onChange({
                    name: cfg.name,
                    imageUrl: cfg.imageUrl,
                    imageKey: cfg.imageKey,
                  })
                }
                className={`${tileBase} ${
                  selected
                    ? "border-cine-primary ring-2 ring-cine-primary/30"
                    : "border-slate-200 hover:border-cine-primary/40 dark:border-slate-700"
                }`}
              >
                <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded bg-slate-50 dark:bg-slate-800">
                  {cfg.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cfg.imageUrl}
                      alt={cfg.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Speaker className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <span className="w-full truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {cfg.name}
                </span>
                {selected && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cine-primary text-white">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="Delete configuration"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    deleteM.mutate(cfg._id);
                    if (value?.name === cfg.name) onChange(null);
                  }}
                  className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/80 text-slate-400 hover:text-red-500 dark:bg-slate-900/80"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Add new */}
      {adding ? (
        <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/60">
          <Input
            placeholder="Name — e.g. 5.1, 7.1, 7.1.4 Dolby Atmos"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-cine-primary dark:border-slate-700 dark:bg-slate-800"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="config"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs">
                <ImagePlus className="h-5 w-5" /> Upload diagram image
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAdding(false);
                setName("");
                setImageUrl("");
                setImageKey("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!name.trim() || uploading || createM.isPending}
              onClick={() => createM.mutate()}
            >
              {createM.isPending ? "Saving…" : "Save configuration"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-4 w-4" /> Add configuration
        </Button>
      )}
    </div>
  );
}
