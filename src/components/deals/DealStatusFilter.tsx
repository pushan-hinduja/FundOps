"use client";

import { useState } from "react";
import { Archive } from "lucide-react";

const STATUSES = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

interface DealStatusFilterProps {
  counts: Record<string, number>;
  onFilterChange: (status: string) => void;
}

export function DealStatusFilter({ counts, onFilterChange }: DealStatusFilterProps) {
  const [active, setActive] = useState("all");

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {STATUSES.map(({ value, label }) => {
        const count = value === "all" ? counts.all : (counts[value] || 0);
        if (value !== "all" && value !== "archived" && count === 0) return null;
        if (value === "archived" && count === 0) return null;

        const isActive = active === value;
        const isArchived = value === "archived";

        return (
          <button
            key={value}
            onClick={() => {
              setActive(value);
              onFilterChange(value);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              isArchived
                ? isActive
                  ? "bg-muted-foreground/20 text-muted-foreground border border-dashed border-muted-foreground/40"
                  : "bg-muted-foreground/5 text-muted-foreground/60 border border-dashed border-muted-foreground/20 hover:text-muted-foreground hover:border-muted-foreground/40"
                : isActive
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {isArchived && <Archive className="w-3 h-3" />}
            {label}
            <span className={`${
              isArchived
                ? isActive ? "text-muted-foreground/60" : "text-muted-foreground/40"
                : isActive ? "text-background/60" : "text-muted-foreground/60"
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
