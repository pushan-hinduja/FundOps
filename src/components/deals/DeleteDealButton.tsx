"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface DeleteDealButtonProps {
  dealId: string;
  dealName: string;
}

export function DeleteDealButton({ dealId, dealName }: DeleteDealButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/deals");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete deal");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        className="self-stretch px-2.5 rounded-xl bg-secondary text-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 flex items-center"
        title="Delete Deal"
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
        title="Delete Deal?"
        description={`This will permanently delete "${dealName}" and all associated LP relationships. This action cannot be undone.`}
        confirmText="Delete Deal"
        variant="danger"
      />
    </>
  );
}
