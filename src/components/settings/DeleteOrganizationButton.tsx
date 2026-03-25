"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface DeleteOrganizationButtonProps {
  orgName: string;
}

export function DeleteOrganizationButton({ orgName }: DeleteOrganizationButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/organization", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = "/dashboard";
    } catch (err: any) {
      alert(err.message || "Failed to delete organization");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive border border-destructive/30 rounded-xl hover:bg-destructive/10 transition-colors disabled:opacity-50"
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
        Delete Organization
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Organization?"
        description={`This will permanently delete "${orgName}" and remove all members. This action cannot be undone.`}
        confirmText="Delete Organization"
        variant="danger"
      />
    </>
  );
}
