"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AISearchBar from "./AISearchBar";

export default function AISearchWrapper() {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const [hasOrg, setHasOrg] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkOrg() {
      try {
        const res = await fetch("/api/user/organizations");
        const data = await res.json();
        setHasOrg(res.ok && !!data.activeOrgId);
      } catch {
        setHasOrg(false);
      }
    }
    checkOrg();
  }, []);

  // Don't render until we know, and hide if no org
  if (!hasOrg) return null;

  return <AISearchBar isDashboard={isDashboard} />;
}
