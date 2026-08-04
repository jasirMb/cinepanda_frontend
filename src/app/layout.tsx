import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ServiceWorkerUpdater } from "@/components/layout/ServiceWorkerUpdater";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Cinepanda Admin",
  description: "Admin panel for Cinepanda",
  applicationName: "Cinepanda",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Cinepanda",
    statusBarStyle: "black-translucent"
  },
  other: {
    "mobile-web-app-capable": "yes"
  },
  icons: {
    icon: "/cinepanda-logo.png",
    shortcut: "/cinepanda-logo.png",
    apple: "/cinepanda-logo.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerUpdater />
        <QueryProvider>{children}</QueryProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
