/**
 * Single source of truth for the API base URL.
 *
 * `NEXT_PUBLIC_API_BASE_URL` is read at build time and used in the browser, so a
 * misconfigured value silently breaks every request. We normalize it here:
 *  - If the protocol is missing (e.g. "api.example.com/api"), axios would treat the
 *    value as a RELATIVE path and prepend the frontend's own origin, producing
 *    "https://frontend/api.example.com/api/..." → 404. We prepend "https://".
 *  - Strip any trailing slash so callers can safely concatenate "/path".
 */
function resolveApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;

  if (!raw) {
    throw new Error(
      "Missing API base URL. Set NEXT_PUBLIC_API_BASE_URL (e.g. https://api.example.com/api)."
    );
  }

  let url = raw.trim();

  // Add a protocol if the value is bare (host[/path]) so it is treated as absolute.
  // Allow protocol-relative ("//host") and localhost (http) to pass through sensibly.
  if (!/^https?:\/\//i.test(url)) {
    url = url.replace(/^\/+/, ""); // drop any leading slashes before adding scheme
    const isLocal = /^localhost(:\d+)?(\/|$)/i.test(url) || /^127\.0\.0\.1/.test(url);
    url = `${isLocal ? "http" : "https"}://${url}`;
  }

  // Remove trailing slash(es) for predictable concatenation.
  return url.replace(/\/+$/, "");
}

export const API_BASE_URL = resolveApiBaseUrl();
