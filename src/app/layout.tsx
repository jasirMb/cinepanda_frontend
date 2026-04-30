import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "CinePanda Admin",
  description: "Admin panel for CinePanda",
  applicationName: "CinePanda",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CinePanda",
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
        <QueryProvider>{children}</QueryProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
