"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  COUNTRY_CODE_OPTIONS,
  DEFAULT_COUNTRY_CODE,
  parsePhonePaste,
} from "@/lib/country-codes";

interface PhoneFieldProps {
  /** Selected dialing code, e.g. "+91". */
  countryCode?: string | null;
  /** National number (digits only). */
  number?: string | null;
  onCountryCodeChange: (code: string) => void;
  onNumberChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Width of the country-code picker. */
  codeClassName?: string;
}

/**
 * A phone input: a searchable country-code picker + a number field. Typing
 * strips spaces; pasting a full international number (e.g. "+91 12345 12345")
 * auto-splits it — the code jumps to the picker and the rest into the number.
 */
export function PhoneField({
  countryCode,
  number,
  onCountryCodeChange,
  onNumberChange,
  placeholder = "9XXXX XXXXX",
  disabled,
  className,
  codeClassName,
}: PhoneFieldProps) {
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    const parsed = parsePhonePaste(text);
    // Only intercept when a country code was explicitly detected ("+" / "00").
    if (parsed.countryCode) {
      e.preventDefault();
      onCountryCodeChange(parsed.countryCode);
      onNumberChange(parsed.number);
    }
    // Otherwise fall through to the default paste; onChange strips the spaces.
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Combobox
        options={COUNTRY_CODE_OPTIONS}
        value={countryCode || DEFAULT_COUNTRY_CODE}
        onChange={(v) => v && onCountryCodeChange(v)}
        placeholder="Code"
        searchPlaceholder="Search country…"
        emptyText="No country found"
        disabled={disabled}
        className={cn("w-[116px] shrink-0", codeClassName)}
        contentClassName="w-[16rem]"
      />
      <Input
        value={number ?? ""}
        onChange={(e) => onNumberChange(e.target.value.replace(/\s+/g, ""))}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="tel"
        className="flex-1"
      />
    </div>
  );
}
