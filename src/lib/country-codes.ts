import type { ComboboxOption } from "@/components/ui/combobox";

/**
 * Shared country dialing-code data + phone helpers used by every phone input
 * (leads, customers, vendors, labours, staff). Single source of truth on the
 * frontend — mirrors the backend list in `cinepanda_backend/src/utils/phone.ts`.
 */

export const DEFAULT_COUNTRY_CODE = "+91"; // India

export interface CountryCode {
  /** Dialing code stored in the DB, e.g. "+91". */
  code: string;
  /** Country name — used for searching the picker. */
  name: string;
  /** Emoji flag. */
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  // Asia
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "+60", name: "Malaysia", flag: "🇲🇾" },
  { code: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "+66", name: "Thailand", flag: "🇹🇭" },
  { code: "+62", name: "Indonesia", flag: "🇮🇩" },
  { code: "+63", name: "Philippines", flag: "🇵🇭" },
  { code: "+84", name: "Vietnam", flag: "🇻🇳" },
  { code: "+880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+92", name: "Pakistan", flag: "🇵🇰" },
  { code: "+94", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "+971", name: "UAE", flag: "🇦🇪" },
  { code: "+974", name: "Qatar", flag: "🇶🇦" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+965", name: "Kuwait", flag: "🇰🇼" },
  { code: "+973", name: "Bahrain", flag: "🇧🇭" },
  { code: "+968", name: "Oman", flag: "🇴🇲" },
  { code: "+972", name: "Israel", flag: "🇮🇱" },
  { code: "+90", name: "Turkey", flag: "🇹🇷" },
  // Africa
  { code: "+212", name: "Morocco", flag: "🇲🇦" },
  { code: "+20", name: "Egypt", flag: "🇪🇬" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+256", name: "Uganda", flag: "🇺🇬" },
  { code: "+255", name: "Tanzania", flag: "🇹🇿" },
  { code: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "+237", name: "Cameroon", flag: "🇨🇲" },
  { code: "+251", name: "Ethiopia", flag: "🇪🇹" },
  { code: "+216", name: "Tunisia", flag: "🇹🇳" },
  { code: "+213", name: "Algeria", flag: "🇩🇿" },
  { code: "+242", name: "Congo", flag: "🇨🇬" },
  { code: "+244", name: "Angola", flag: "🇦🇴" },
  { code: "+258", name: "Mozambique", flag: "🇲🇿" },
  { code: "+260", name: "Zambia", flag: "🇿🇲" },
  { code: "+263", name: "Zimbabwe", flag: "🇿🇼" },
  { code: "+249", name: "Sudan", flag: "🇸🇩" },
  // Europe
  { code: "+44", name: "UK", flag: "🇬🇧" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "+32", name: "Belgium", flag: "🇧🇪" },
  { code: "+41", name: "Switzerland", flag: "🇨🇭" },
  { code: "+43", name: "Austria", flag: "🇦🇹" },
  { code: "+45", name: "Denmark", flag: "🇩🇰" },
  { code: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "+48", name: "Poland", flag: "🇵🇱" },
  { code: "+358", name: "Finland", flag: "🇫🇮" },
  { code: "+353", name: "Ireland", flag: "🇮🇪" },
  { code: "+30", name: "Greece", flag: "🇬🇷" },
  { code: "+36", name: "Hungary", flag: "🇭🇺" },
  { code: "+40", name: "Romania", flag: "🇷🇴" },
  { code: "+420", name: "Czech Republic", flag: "🇨🇿" },
  { code: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "+380", name: "Ukraine", flag: "🇺🇦" },
  { code: "+359", name: "Bulgaria", flag: "🇧🇬" },
  { code: "+385", name: "Croatia", flag: "🇭🇷" },
  { code: "+389", name: "North Macedonia", flag: "🇲🇰" },
  // Americas
  { code: "+1", name: "USA", flag: "🇺🇸" },
  { code: "+1", name: "Canada", flag: "🇨🇦" },
  { code: "+52", name: "Mexico", flag: "🇲🇽" },
  { code: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "+57", name: "Colombia", flag: "🇨🇴" },
  { code: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "+51", name: "Peru", flag: "🇵🇪" },
  { code: "+58", name: "Venezuela", flag: "🇻🇪" },
  { code: "+591", name: "Bolivia", flag: "🇧🇴" },
  { code: "+592", name: "Guyana", flag: "🇬🇾" },
  { code: "+593", name: "Ecuador", flag: "🇪🇨" },
  { code: "+595", name: "Paraguay", flag: "🇵🇾" },
  { code: "+598", name: "Uruguay", flag: "🇺🇾" },
  { code: "+1-242", name: "Bahamas", flag: "🇧🇸" },
  { code: "+1-246", name: "Barbados", flag: "🇧🇧" },
  { code: "+1-868", name: "Trinidad and Tobago", flag: "🇹🇹" },
  // Oceania
  { code: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "+64", name: "New Zealand", flag: "🇳🇿" },
  { code: "+675", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "+679", name: "Fiji", flag: "🇫🇯" },
  { code: "+688", name: "Tuvalu", flag: "🇹🇻" },
];

/**
 * Options for the searchable Combobox. The trigger shows a compact
 * "🇮🇳 +91", while the `hint` (country name) keeps the list searchable by name.
 */
export const COUNTRY_CODE_OPTIONS: ComboboxOption[] = COUNTRY_CODES.map((c) => ({
  value: c.code,
  label: `${c.flag} ${c.code}`,
  hint: c.name,
}));

// Pure dialing codes (no NANP "+1-242" style sub-codes) in digit form, sorted
// longest-first so smart-paste matches the most specific code first.
const DIAL_PREFIXES = COUNTRY_CODES.filter((c) => !c.code.includes("-"))
  .map((c) => ({ code: c.code, digits: c.code.replace(/\D/g, "") }))
  .sort((a, b) => b.digits.length - a.digits.length);

export interface ParsedPhone {
  /** Detected dialing code, or null when the input had no explicit "+"/"00". */
  countryCode: string | null;
  /** The remaining national number, digits only. */
  number: string;
}

/**
 * Parse a pasted phone string. Only extracts a country code when the value
 * explicitly starts with "+" or "00" (e.g. "+91 12345 12345" → code "+91",
 * number "1234512345"). A plain local number is returned untouched (digits
 * only) so we never strip leading digits from a number that has no code.
 */
export function parsePhonePaste(raw: string): ParsedPhone {
  let s = raw.trim();
  if (s.startsWith("00")) s = "+" + s.slice(2);

  if (s.startsWith("+")) {
    const digits = s.slice(1).replace(/\D/g, "");
    const match = DIAL_PREFIXES.find((p) => digits.startsWith(p.digits));
    if (match) {
      return { countryCode: match.code, number: digits.slice(match.digits.length) };
    }
    return { countryCode: null, number: digits };
  }

  return { countryCode: null, number: s.replace(/\D/g, "") };
}

/** Display form, e.g. "+91 9876543210". Returns "" when there is no number. */
export function formatPhone(
  countryCode?: string | null,
  phone?: string | null
): string {
  if (!phone) return "";
  const code = countryCode?.trim();
  return code ? `${code} ${phone}` : phone;
}

/** `tel:` href, e.g. "tel:+919876543210". */
export function telHref(
  countryCode?: string | null,
  phone?: string | null
): string {
  const code = (countryCode ?? "").replace(/[^\d+]/g, "");
  const num = (phone ?? "").replace(/\D/g, "");
  return `tel:${code}${num}`;
}
