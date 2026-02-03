"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  InvestorType,
  AccreditationStatus,
  TaxStatus,
  KYCStatus,
  INVESTOR_TYPE_LABELS,
  ACCREDITATION_STATUS_LABELS,
  TAX_STATUS_LABELS,
  KYC_STATUS_LABELS,
} from "@/lib/supabase/types";

export default function NewLPPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [firm, setFirm] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredCheckSize, setPreferredCheckSize] = useState("");
  const [notes, setNotes] = useState("");

  // LP Passport fields
  const [investorType, setInvestorType] = useState<InvestorType | "">("");
  const [accreditationStatus, setAccreditationStatus] = useState<
    AccreditationStatus | ""
  >("");
  const [taxStatus, setTaxStatus] = useState<TaxStatus | "">("");
  const [kycStatus, setKycStatus] = useState<KYCStatus>("not_started");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const investorTypes: InvestorType[] = [
    "individual",
    "institution",
    "family_office",
    "fund_of_funds",
    "endowment",
    "pension",
    "sovereign_wealth",
  ];

  const accreditationStatuses: AccreditationStatus[] = [
    "accredited_investor",
    "qualified_purchaser",
    "qualified_client",
    "non_accredited",
  ];

  const taxStatuses: TaxStatus[] = [
    "us_individual",
    "us_entity",
    "foreign_individual",
    "foreign_entity",
    "tax_exempt",
  ];

  const kycStatuses: KYCStatus[] = [
    "not_started",
    "pending",
    "in_review",
    "approved",
    "expired",
    "rejected",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get current user's organization
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!userData?.organization_id) {
        throw new Error("No organization found");
      }

      // Create LP
      const { error: insertError } = await supabase.from("lp_contacts").insert({
        organization_id: userData.organization_id,
        name,
        email,
        firm: firm || null,
        title: title || null,
        phone: phone || null,
        preferred_check_size: preferredCheckSize
          ? parseInt(preferredCheckSize)
          : null,
        notes: notes || null,
        investor_type: investorType || null,
        accreditation_status: accreditationStatus || null,
        tax_status: taxStatus || null,
        kyc_status: kycStatus,
      });

      if (insertError) throw insertError;

      router.push("/lps");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create LP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-8 py-6 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/lps"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to LPs
        </Link>
        <h1 className="text-3xl font-medium tracking-tight mt-4">
          Add LP Contact
        </h1>
        <p className="text-muted-foreground mt-1">
          Add a new limited partner to your network
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 glass-card rounded-2xl p-8"
      >
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="firm" className="block text-sm font-medium mb-2">
                Firm
              </label>
              <input
                id="firm"
                type="text"
                value={firm}
                onChange={(e) => setFirm(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Smith Family Office"
              />
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Managing Partner"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label
                htmlFor="preferredCheckSize"
                className="block text-sm font-medium mb-2"
              >
                Preferred Check Size ($)
              </label>
              <input
                id="preferredCheckSize"
                type="number"
                value={preferredCheckSize}
                onChange={(e) => setPreferredCheckSize(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="250000"
              />
            </div>
          </div>
        </div>

        {/* LP Passport Fields */}
        <div className="pt-4 border-t border-border">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            Investor Profile
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="investorType"
                className="block text-sm font-medium mb-2"
              >
                Investor Type
              </label>
              <select
                id="investorType"
                value={investorType}
                onChange={(e) =>
                  setInvestorType(e.target.value as InvestorType | "")
                }
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Select...</option>
                {investorTypes.map((type) => (
                  <option key={type} value={type}>
                    {INVESTOR_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="accreditationStatus"
                className="block text-sm font-medium mb-2"
              >
                Accreditation Status
              </label>
              <select
                id="accreditationStatus"
                value={accreditationStatus}
                onChange={(e) =>
                  setAccreditationStatus(
                    e.target.value as AccreditationStatus | ""
                  )
                }
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Select...</option>
                {accreditationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {ACCREDITATION_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label
                htmlFor="taxStatus"
                className="block text-sm font-medium mb-2"
              >
                Tax Status
              </label>
              <select
                id="taxStatus"
                value={taxStatus}
                onChange={(e) => setTaxStatus(e.target.value as TaxStatus | "")}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Select...</option>
                {taxStatuses.map((status) => (
                  <option key={status} value={status}>
                    {TAX_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="kycStatus"
                className="block text-sm font-medium mb-2"
              >
                KYC Status
              </label>
              <select
                id="kycStatus"
                value={kycStatus}
                onChange={(e) => setKycStatus(e.target.value as KYCStatus)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                {kycStatuses.map((status) => (
                  <option key={status} value={status}>
                    {KYC_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium mb-2">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            placeholder="Any relevant notes about this LP..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Add LP"}
          </button>
          <Link
            href="/lps"
            className="px-6 py-3 bg-secondary text-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
