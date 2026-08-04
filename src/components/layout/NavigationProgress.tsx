"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * A YouTube-style top progress bar that gives INSTANT feedback the moment an
 * internal link is tapped and stays visible until the new route commits.
 *
 * Why this exists: Next.js App Router keeps the current page on screen (frozen)
 * while it fetches the destination's RSC payload. On a slow response that gap
 * can be several seconds with no feedback — the page feels "stuck". `loading.tsx`
 * only shows AFTER that fetch commits, so it can't cover the gap. This bar fills
 * it: it starts on the click (before the fetch) and finishes when `usePathname`
 * changes (navigation committed).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setVisible(true);
    setWidth(8);
    // Trickle toward 90% so a long response still looks alive.
    const steps: Array<[number, number]> = [
      [120, 25],
      [320, 45],
      [700, 64],
      [1400, 78],
      [3000, 88],
      [6000, 94],
    ];
    steps.forEach(([delay, w]) =>
      timers.current.push(setTimeout(() => setWidth(w), delay))
    );
    // Safety: never leave the bar hanging if a navigation is cancelled.
    timers.current.push(setTimeout(() => finishRef.current(), 20000));
  }, [clearTimers]);

  const finish = useCallback(() => {
    clearTimers();
    setVisible((v) => {
      if (!v) return false;
      setWidth(100);
      timers.current.push(
        setTimeout(() => {
          setVisible(false);
          setWidth(0);
        }, 280)
      );
      return true;
    });
  }, [clearTimers]);

  // Keep a stable ref so the safety timer can call the latest finish().
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // START: capture clicks on internal links before the router handles them.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      // Same page (query-only changes are in-page filters) → no bar.
      if (url.pathname === window.location.pathname) return;
      start();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  // END: the route committed (pathname changed) → complete the bar.
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      data-nav-progress=""
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "linear-gradient(to right, #1f3a5f, #5b7ec2, #b0883c)",
          boxShadow: "0 0 10px rgba(176,136,60,0.7), 0 0 4px rgba(91,126,194,0.8)",
          borderRadius: "0 2px 2px 0",
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}
