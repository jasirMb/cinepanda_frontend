"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  // Accepts local datetime string "YYYY-MM-DDTHH:mm" (matches HTML datetime-local)
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  // Default time applied when the user picks a date before setting a time.
  defaultTime?: string; // "HH:mm"
}

function parseValue(value?: string | null): {
  date: Date | undefined;
  time: string;
} {
  if (!value) return { date: undefined, time: "" };
  const [datePart, timePart = ""] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const time = /^\d{2}:\d{2}/.test(timePart) ? timePart.slice(0, 5) : "";
  if (!y || !m || !d) return { date: undefined, time };
  return { date: new Date(y, m - 1, d), time };
}

function format(date: Date, time: string) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const t = /^\d{2}:\d{2}$/.test(time) ? time : "00:00";
  return `${yyyy}-${mm}-${dd}T${t}`;
}

function formatTimeDisplay(time: string): string {
  if (!/^\d{2}:\d{2}$/.test(time)) return "";
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  className,
  defaultTime = "09:00",
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const { date, time } = parseValue(value);

  const label = date
    ? `${date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}${time ? `, ${formatTimeDisplay(time)}` : ""}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 w-full justify-start text-left font-normal",
            !date && "text-slate-500 dark:text-slate-400",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (!d) {
              onChange("");
              return;
            }
            onChange(format(d, time || defaultTime));
          }}
          defaultMonth={date}
        />
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Time
          </label>
          <Input
            type="time"
            value={time}
            onChange={(e) => {
              const t = e.target.value;
              const base = date ?? new Date();
              onChange(format(base, t || defaultTime));
            }}
          />
          <Button
            type="button"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
