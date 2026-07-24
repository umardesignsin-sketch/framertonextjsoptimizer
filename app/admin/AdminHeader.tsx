"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { Logo } from "@/components/Logo";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "grid" as const },
  { href: "/admin/users", label: "Signups", icon: "users" as const },
  { href: "/admin/blog", label: "Blog", icon: "pencil" as const },
];

export function AdminHeader() {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:px-5">
        <Logo size={28} className="shrink-0" />
        <span className="hidden text-[13px] font-semibold tracking-tight text-foreground sm:inline">
          Founders panel
        </span>

        <nav className="ml-1 flex flex-1 items-center gap-0.5 overflow-x-auto sm:ml-4">
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon name={item.icon} size={13} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          title="Log out"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
        >
          <Icon name="logout" size={13} />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
