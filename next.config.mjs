import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  // PWA service worker: ON in production, OFF in dev. Running it in `next dev`
  // makes the SW cache stale page shells and serve chunks the dev server has
  // already rebuilt — which surfaces as "Invariant: missing bootstrap script"
  // and random 404s. To deliberately test the PWA locally, set ENABLE_PWA_DEV=true.
  disable:
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_PWA_DEV !== "true"
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

export default withSerwist(nextConfig);
