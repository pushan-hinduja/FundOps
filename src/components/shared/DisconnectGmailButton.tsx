"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DisconnectGmailButton({ accountId }: { accountId: string }) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const router = useRouter();

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this Gmail account?")) {
      return;
    }

    setIsDisconnecting(true);

    try {
      const response = await fetch(`/api/auth/google/disconnect?id=${accountId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to disconnect Gmail account");
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <button
      onClick={handleDisconnect}
      disabled={isDisconnecting}
      className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded transition disabled:opacity-50"
    >
      {isDisconnecting ? "Disconnecting..." : "Disconnect"}
    </button>
  );
}
