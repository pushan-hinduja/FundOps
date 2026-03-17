"use client";

import { useState } from "react";

const STATUSES = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

interface DealStatusFilterProps {
  counts: Record<string, number>;
  onFilterChange: (status: string) => void;
}

export function DealStatusFilter({ counts, onFilterChange }: DealStatusFilterProps) {
  const [active, setActive] = useState("all");

  return (
    <div className="flex items-center gap-2">
      {STATUSES.map(({ value, label }) => {
        const count = value === "all" ? counts.all : (counts[value] || 0);
        if (value !== "all" && count === 0) return null;

        const isActive = active === value;
        return (
          <button
            key={value}
            onClick={() => {
              setActive(value);
              onFilterChange(value);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            <span className={`ml-1.5 ${isActive ? "text-background/60" : "text-muted-foreground/60"}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
