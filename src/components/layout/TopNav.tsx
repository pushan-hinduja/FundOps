"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Briefcase,
  Zap,
  FileText,
  Users,
  BarChart3,
  Settings,
  Search,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/deals", icon: Briefcase, label: "Deals" },
  { href: "/lps", icon: Users, label: "LPs" },
  { href: "/settings", icon: Settings, label: "Settings" },
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

      {/* Center: Navigation Icons */}
      <nav className="flex-1 flex items-center justify-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "nav-icon-btn",
                isActive ? "nav-icon-btn-active" : "nav-icon-btn-inactive"
              )}
              title={item.label}
            >
              <item.icon className="w-[18px] h-[18px]" />
            </Link>
          );
        })}
      </nav>

      {/* Right: Search and Profile */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Type Client Name or ID..."
            className="w-52 h-10 pl-9 pr-4 text-sm bg-white border border-border rounded-xl placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
        </div>

        {/* Icon buttons */}
        <button className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          <Zap className="w-[18px] h-[18px]" />
        </button>
        <button className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          <Settings className="w-[18px] h-[18px]" />
        </button>

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
              <div className="absolute right-0 top-full mt-2 w-48 bg-card rounded-xl shadow-lg border border-border py-1 z-50">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors w-full"
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
