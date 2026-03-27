"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ShieldCheck, Loader2 } from "lucide-react";

interface NdaAcceptanceClientProps {
  dealId: string;
  dealName: string;
  companyName: string | null;
  documentUrl: string | null;
}

export function NdaAcceptanceClient({
  dealId,
  dealName,
  companyName,
  documentUrl,
}: NdaAcceptanceClientProps) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!accepted) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/nda/accept`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record acceptance");
      }

      router.push(`/deals/${dealId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 md:px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-medium">Non-Disclosure Agreement</h1>
            <p className="text-sm text-muted-foreground">
              {dealName}
              {companyName && ` (${companyName})`}
            </p>
          </div>
        </div>
      </div>

      {/* Document Viewer (only if document exists) */}
      {documentUrl && (
        <div className="flex-1 overflow-hidden px-4 md:px-8 py-6">
          <div className="h-full rounded-2xl border border-border overflow-hidden bg-white">
            <iframe
              src={`${documentUrl}#toolbar=0`}
              className="w-full h-full"
              title="NDA Document"
            />
          </div>
        </div>
      )}

      {/* Acceptance Section */}
      <div className={`${documentUrl ? "border-t border-border" : "flex-1 flex items-center"} px-4 md:px-8 py-5 shrink-0`}>
        <div className="max-w-3xl mx-auto w-full">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm px-4 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="glass-card rounded-xl p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                By checking this box, I acknowledge and agree to be bound by the terms
                and conditions of the Non-Disclosure Agreement governing this deal,
                including but not limited to obligations of confidentiality, non-use, and
                non-disclosure of all proprietary and confidential information related to{" "}
                <span className="font-medium text-foreground">
                  {dealName}
                  {companyName && ` (${companyName})`}
                </span>
                . I understand that any breach of this agreement may result in legal action
                and liability for damages. This electronic acceptance constitutes my legally
                binding signature.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => router.push("/deals")}
              className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Deals
            </button>
            <button
              onClick={handleAccept}
              disabled={!accepted || isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Processing..." : "Accept & Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
