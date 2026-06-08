"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  /** When set, the user must type this exact text before the confirm button enables. */
  requireText?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Confirm",
  variant = "destructive",
  requireText,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  // Reset the typed confirmation each time the dialog opens/closes.
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const matched = !requireText || typed.trim() === requireText;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requireText && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Type{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {requireText}
              </span>{" "}
              to confirm
            </label>
            <Input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matched) {
                  e.preventDefault();
                  onConfirm();
                  onOpenChange(false);
                }
              }}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matched}
            onClick={(e) => {
              if (!matched) {
                e.preventDefault();
                return;
              }
              onConfirm();
            }}
            className={cn(
              variant === "destructive" &&
                buttonVariants({ variant: "destructive" }),
              !matched && "pointer-events-none opacity-50"
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
