"use client";

import { usePathname } from "next/navigation";
import AISearchBar from "./AISearchBar";

export default function AISearchWrapper() {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

  return <AISearchBar isDashboard={isDashboard} />;
}
