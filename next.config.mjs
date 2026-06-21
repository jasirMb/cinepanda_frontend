import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  // The PWA service worker now runs in dev too (so you can test offline /
  // install behaviour locally). Set DISABLE_PWA=true to turn it back off if its
  // caching ever interferes with hot-reload while debugging.
  disable: process.env.DISABLE_PWA === "true"
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

export default withSerwist(nextConfig);
