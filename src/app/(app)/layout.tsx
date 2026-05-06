"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TestBadge } from "@/components/test-banner";
import { ToastProvider } from "@/components/toast";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/contractors": "Contractors",
  "/pay": "Send Payment",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title =
    Object.entries(pageTitles).find(([path]) =>
      pathname.startsWith(path)
    )?.[1] || "FlashPay";

  return (
    <ToastProvider>
      <Sidebar />
      <div className="ml-[200px] min-h-screen relative z-[1]">
        <header className="h-14 border-b border-[var(--border)] flex items-center justify-between px-8 bg-[var(--bg-base)]/80 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="font-heading font-semibold text-xl text-[var(--text-primary)]">
            {title}
          </h1>
          <TestBadge />
        </header>
        <main className="p-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
