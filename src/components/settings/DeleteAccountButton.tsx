"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface DeleteAccountButtonProps {
  soleOrgNames: string[];
}

export function DeleteAccountButton({ soleOrgNames }: DeleteAccountButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const willDeleteOrgs = soleOrgNames.length > 0;
  const buttonLabel = willDeleteOrgs
    ? "Delete Account and Organization"
    : "Delete Account";

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/account", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = "/login";
    } catch (err: any) {
      alert(err.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const description = (
    <>
      This will permanently delete your account and remove all your data. You
      will be signed out and will not be able to recover your account. This
      action cannot be undone.
      {willDeleteOrgs && (
        <>
          {"\n\n"}Because you are the only member, this will also permanently
          delete the following organization
          {soleOrgNames.length > 1 ? "s" : ""} and all of{" "}
          {soleOrgNames.length > 1 ? "their" : "its"} data:{" "}
          {soleOrgNames.map((name, i) => (
            <span key={name}>
              {i > 0 && ", "}
              <strong className="text-foreground">{name}</strong>
            </span>
          ))}
          .
        </>
      )}
    </>
  );

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
        {buttonLabel}
      </button>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Account?"
        description={description}
        confirmText={buttonLabel}
        variant="danger"
      />
    </>
  );
}
