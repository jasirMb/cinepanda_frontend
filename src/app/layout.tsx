import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "CinePanda Admin",
  description: "Admin panel for CinePanda",
  icons: {
    icon: "/cinepanda-logo.png",
    shortcut: "/cinepanda-logo.png",
    apple: "/cinepanda-logo.png"
  }
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

