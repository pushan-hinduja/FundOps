"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Archive } from "lucide-react";

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

function getStatusStyles(status: string) {
  switch (status) {
    case "active":
      return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
    case "draft":
      return "bg-secondary text-muted-foreground";
    case "closed":
      return "bg-foreground/10 text-foreground";
    case "archived":
      return "bg-muted-foreground/10 text-muted-foreground border border-dashed border-muted-foreground/30";
    default:
      return "bg-secondary text-muted-foreground";
  }
}

function getDropdownItemStyles(status: string) {
  switch (status) {
    case "active":
      return "text-[hsl(var(--success))]";
    case "draft":
      return "text-muted-foreground";
    case "closed":
      return "text-foreground";
    case "archived":
      return "text-muted-foreground";
    default:
      return "text-foreground";
  }
}

interface DealStatusPillProps {
  dealId: string;
  currentStatus: string;
}

export function DealStatusPill({ dealId, currentStatus }: DealStatusPillProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      router.refresh();
    } catch {
      alert("Failed to update deal status");
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`px-4 py-2 rounded-xl text-sm font-medium capitalize flex items-center gap-1.5 transition-all hover:ring-2 hover:ring-foreground/10 ${getStatusStyles(currentStatus)} ${isUpdating ? "opacity-50" : "cursor-pointer"}`}
      >
        {currentStatus === "archived" && <Archive className="w-3.5 h-3.5" />}
        {isUpdating ? "Updating..." : currentStatus}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
          {STATUSES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleStatusChange(value)}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
                value === currentStatus
                  ? "bg-secondary/80 cursor-default"
                  : "hover:bg-secondary/50"
              } ${getDropdownItemStyles(value)}`}
            >
              {value === "archived" && <Archive className="w-3.5 h-3.5" />}
              <span className="capitalize">{label}</span>
              {value === currentStatus && (
                <span className="ml-auto text-xs text-muted-foreground/60">Current</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
