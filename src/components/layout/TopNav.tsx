"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Briefcase,
  Bell,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/deals", icon: Briefcase, label: "Deals" },
  { href: "/lps", icon: Users, label: "LPs" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          email: authUser.email,
          name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
        });
      }
    };
    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-20 bg-white px-8 flex items-center">
      {/* Left: Logo */}
      <div className="flex items-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4 text-primary-foreground"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-lg font-medium tracking-tight">FundOps</span>
        </Link>
      </div>

      {/* Center: Navigation */}
      <nav className="flex-1 flex items-center justify-center gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "text-muted-foreground border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
                )}
              >
                <item.icon className="w-[18px] h-[18px]" />
              </Link>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 glass-menu rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Right: Actions and Profile */}
      <div className="flex items-center gap-3">
        {/* Action Icons */}
        <div className="flex items-center gap-2">
          {[
            { href: "/notifications", icon: Bell, label: "Notifications" },
            { href: "/settings", icon: Settings, label: "Settings" },
          ].map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  )}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                </Link>
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 glass-menu rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl hover:bg-secondary/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-xs font-medium text-white">
              {getInitials(user?.name)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium leading-tight">{user?.name || "User"}</div>
              <div className="text-xs text-muted-foreground leading-tight">Manager</div>
            </div>
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 glass-menu rounded-xl py-1 z-50">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-white/30 dark:hover:bg-white/10 transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
