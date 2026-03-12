"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface DeleteLPButtonProps {
  lpId: string;
  lpName: string;
}

export function DeleteLPButton({ lpId, lpName }: DeleteLPButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/lps/${lpId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/lps");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete LP");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        className="px-2.5 py-2 rounded-xl bg-secondary text-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 inline-flex items-center text-sm leading-5"
        title="Delete LP"
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete LP?"
        description={`This will permanently delete "${lpName}" and all associated data. This action cannot be undone.`}
        confirmText="Delete LP"
        variant="danger"
      />
    </>
  );
}
