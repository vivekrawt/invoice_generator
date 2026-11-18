"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus,
  Files,
  Users,
  Package,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api-client";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Create Invoice",
    href: "/invoices/new",
    icon: FilePlus,
  },
  {
    title: "All Invoices",
    href: "/invoices",
    icon: Files,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Products Catalogue",
    href: "/products",
    icon: Package,
  },
  {
    title: "Business Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await apiRequest("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center px-6 border-b border-slate-200/80 bg-white">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-[#0b1f3a] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              A
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 text-sm tracking-tight leading-tight">
                ABIRA ENTERPRISES
              </span>
              <span className="text-[11px] font-medium text-slate-500 tracking-wide uppercase">
                Invoice & Catalogue
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-all group",
                  isActive
                    ? "bg-[#0b1f3a] text-white shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  <span>{item.title}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer / User / Logout */}
      <div className="p-3 border-t border-slate-200/80 bg-white">
        <div className="mb-2 px-3 py-2 rounded-md bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-800 truncate">
                ABIRA Enterprises
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                Gurugram, Haryana
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <LogOut className="h-4 w-4 text-slate-400 group-hover:text-red-600" />
          <span>{loggingOut ? "Signing out..." : "Logout"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-30 border-r border-slate-200 bg-white">
        {navContent}
      </aside>

      {/* Mobile Sidebar Backdrop & Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-[80vw] bg-white border-r border-slate-200 shadow-xl z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}

export function Header({
  onMenuToggle,
  title,
}: {
  onMenuToggle: () => void;
  title?: string;
}) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
          {title || "Dashboard"}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
          <span>Operational</span>
        </div>
      </div>
    </header>
  );
}
