"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Briefcase,
  Users,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Check,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { CreateOrgModal } from "@/components/shared/CreateOrgModal";

interface OrgItem {
  id: string;
  name: string;
  domain: string | null;
  role: string;
  isActive: boolean;
}

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
  const [userLoading, setUserLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [organizations, setOrganizations] = useState<OrgItem[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [switchingOrg, setSwitchingOrg] = useState(false);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      setUserLoading(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        // Use the profile API which bypasses RLS (works for users without an org)
        try {
          const res = await fetch("/api/user/profile");
          if (res.ok) {
            const data = await res.json();
            setUser({
              email: data.user?.email || authUser.email,
              name: data.user?.name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
            });
            return;
          }
        } catch {}

        // Fallback to auth metadata
        setUser({
          email: authUser.email,
          name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
        });
      } finally {
        setUserLoading(false);
      }
    };
    getUser();

    // Update nav instantly when profile is saved in settings
    const handleProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.name || detail?.email) {
        setUser((prev) => ({
          ...prev,
          name: detail.name || prev?.name,
          email: detail.email || prev?.email,
        }));
      }
    };
    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => window.removeEventListener("profile-updated", handleProfileUpdated);
  }, [supabase]);

  const fetchOrgs = useCallback(async () => {
    setOrgsLoading(true);
    try {
      const res = await fetch("/api/user/organizations");
      const data = await res.json();
      if (res.ok && data.organizations) {
        setOrganizations(data.organizations);
      }
    } catch {
      // Silently fail - org switcher just won't show
    } finally {
      setOrgsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSwitchOrg = async (orgId: string) => {
    if (switchingOrg) return;
    setSwitchingOrg(true);
    try {
      const res = await fetch("/api/user/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      if (res.ok) {
        setShowOrgMenu(false);
        router.refresh();
        // Re-fetch orgs to update active state
        await fetchOrgs();
      }
    } catch {
      // Silently fail
    } finally {
      setSwitchingOrg(false);
    }
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

  const handleOrgCreated = async () => {
    setShowCreateOrgModal(false);
    await fetchOrgs();
    router.refresh();
  };

  const activeOrg = organizations.find((o) => o.isActive);
  const hasOrg = !!activeOrg;

  return (
    <header className="h-20 bg-white px-8 flex items-center relative">
      {/* Left: Logo + Org Switcher */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <svg viewBox="130 95 140 150" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
            <line x1="200" y1="170" x2="200" y2="85" stroke="#111111" strokeWidth="4.5" opacity="0.85" transform="rotate(0, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="90" stroke="#111111" strokeWidth="4.5" opacity="0.76" transform="rotate(45, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="88" stroke="#111111" strokeWidth="4.5" opacity="0.8" transform="rotate(90, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="92" stroke="#111111" strokeWidth="4.5" opacity="0.72" transform="rotate(150, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="86" stroke="#111111" strokeWidth="4.5" opacity="0.85" transform="rotate(200, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="90" stroke="#111111" strokeWidth="4.5" opacity="0.76" transform="rotate(270, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="88" stroke="#111111" strokeWidth="4.5" opacity="0.78" transform="rotate(315, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="108" stroke="#111111" strokeWidth="3.25" opacity="0.62" transform="rotate(20, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="112" stroke="#111111" strokeWidth="3.25" opacity="0.56" transform="rotate(65, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="105" stroke="#111111" strokeWidth="3.25" opacity="0.66" transform="rotate(110, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="115" stroke="#111111" strokeWidth="3.25" opacity="0.52" transform="rotate(130, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="110" stroke="#111111" strokeWidth="3.25" opacity="0.58" transform="rotate(175, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="108" stroke="#111111" strokeWidth="3.25" opacity="0.62" transform="rotate(225, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="112" stroke="#111111" strokeWidth="3.25" opacity="0.54" transform="rotate(250, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="106" stroke="#111111" strokeWidth="3.25" opacity="0.64" transform="rotate(295, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="110" stroke="#111111" strokeWidth="3.25" opacity="0.56" transform="rotate(340, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="128" stroke="#111111" strokeWidth="2.25" opacity="0.46" transform="rotate(10, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="132" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(35, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="130" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(55, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="126" stroke="#111111" strokeWidth="2.25" opacity="0.48" transform="rotate(78, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="134" stroke="#111111" strokeWidth="2.25" opacity="0.38" transform="rotate(100, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="128" stroke="#111111" strokeWidth="2.25" opacity="0.44" transform="rotate(120, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="132" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(142, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="130" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(162, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="126" stroke="#111111" strokeWidth="2.25" opacity="0.46" transform="rotate(188, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="134" stroke="#111111" strokeWidth="2.25" opacity="0.38" transform="rotate(212, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="128" stroke="#111111" strokeWidth="2.25" opacity="0.44" transform="rotate(238, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="130" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(258, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="132" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(282, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="126" stroke="#111111" strokeWidth="2.25" opacity="0.46" transform="rotate(305, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="134" stroke="#111111" strokeWidth="2.25" opacity="0.38" transform="rotate(328, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="130" stroke="#111111" strokeWidth="2.25" opacity="0.42" transform="rotate(350, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="88" stroke="#1E3A5F" strokeWidth="5.5" opacity="0.95" transform="rotate(30, 200, 170)"/>
            <line x1="200" y1="170" x2="200" y2="92" stroke="#1E3A5F" strokeWidth="5.5" opacity="0.85" transform="rotate(240, 200, 170)"/>
            <circle cx="200" cy="170" r="13" fill="#111111"/>
            <circle cx="200" cy="170" r="5.25" fill="#FFFFFF"/>
          </svg>
          <span className="text-lg font-medium tracking-tight">FundOps</span>
        </Link>

        {orgsLoading ? (
          <>
            <span className="text-muted-foreground/40 text-lg">/</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5">
              <div className="w-3.5 h-3.5 rounded bg-muted animate-pulse" />
              <div className="w-28 h-4 rounded bg-muted animate-pulse" />
            </div>
          </>
        ) : hasOrg ? (
          <>
            <span className="text-muted-foreground/40 text-lg">/</span>
            <div className="relative">
              <button
                onClick={() => setShowOrgMenu(!showOrgMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-secondary/50 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{activeOrg!.name}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", showOrgMenu && "rotate-180")} />
              </button>

              {showOrgMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowOrgMenu(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-56 glass-menu rounded-xl py-1 z-50">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => !org.isActive && handleSwitchOrg(org.id)}
                        disabled={switchingOrg}
                        className={cn(
                          "flex items-center gap-2.5 px-4 py-2.5 text-sm w-full transition-colors",
                          org.isActive
                            ? "text-foreground font-medium"
                            : "text-foreground hover:bg-white/30 dark:hover:bg-white/10"
                        )}
                      >
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate flex-1 text-left">{org.name}</span>
                        {org.isActive && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </button>
                    ))}
                    <div className="border-t border-border/50 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setShowOrgMenu(false);
                          setShowCreateOrgModal(true);
                        }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm w-full transition-colors text-muted-foreground hover:text-foreground hover:bg-white/30 dark:hover:bg-white/10"
                      >
                        <Plus className="w-4 h-4 flex-shrink-0" />
                        <span>Add Organization</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Center: Navigation - only shown when user has an org, skeleton while loading */}
      {(hasOrg || orgsLoading) && (
        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          {orgsLoading ? (
            navItems.map((item) => (
              <div key={item.href} className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
            ))
          ) : (
          navItems.map((item) => {
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
          })
          )}
        </nav>
      )}

      {/* Right: Actions and Profile */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Action Icons */}
        <div className="flex items-center gap-2">
          {orgsLoading ? (
            <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
          ) : (
            [
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
            })
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          {userLoading ? (
            <div className="flex items-center pl-3 pr-2 py-1.5">
              <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-xs font-medium text-white">
                  {getInitials(user?.name)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-medium leading-tight">{user?.name || "User"}</div>
                  <div className="text-xs text-muted-foreground leading-tight">{user?.email || ""}</div>
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
            </>
          )}
        </div>
      </div>
      <CreateOrgModal
        isOpen={showCreateOrgModal}
        onClose={() => setShowCreateOrgModal(false)}
        onCreated={handleOrgCreated}
      />
    </header>
  );
}
