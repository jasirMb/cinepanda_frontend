import { AuthGuard } from "@/components/auth/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeApplier } from "@/components/layout/ThemeApplier";
import { Topbar } from "@/components/layout/Topbar";

export default function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ThemeApplier />
      <div className="flex h-screen overflow-hidden text-slate-900 dark:text-slate-50">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}

