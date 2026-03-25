"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { DealLinksEditor, type DealLinkEntry } from "./DealLinksEditor";

interface Deal {
  id: string;
  name: string;
  company_name: string | null;
  description: string | null;
  target_raise: number | null;
  min_check_size: number | null;
  max_check_size: number | null;
  fee_percent: number | null;
  carry_percent: number | null;
  status: string;
  memo_url: string | null;
  created_date: string | null;
  close_date: string | null;
  investment_stage: string | null;
  investment_type: string | null;
  founder_email: string | null;
  investor_update_frequency: string | null;
  access: string;
  sector: string | null;
  geography: string | null;
  investment_thesis: string | null;
  nda_document_url?: string | null;
}

interface EditDealModalProps {
  deal: Deal;
  isOpen: boolean;
  onClose: () => void;
  scrollToSection?: string;
}

export function EditDealModal({ deal, isOpen, onClose, scrollToSection }: EditDealModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ndaRequired, setNdaRequired] = useState(false);
  const [ndaFile, setNdaFile] = useState<File | null>(null);
  const [dealLinks, setDealLinks] = useState<DealLinkEntry[]>([]);
  const [existingLinkIds, setExistingLinkIds] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to section when modal opens
  useEffect(() => {
    if (isOpen && scrollToSection && modalRef.current) {
      setTimeout(() => {
        const el = modalRef.current?.querySelector(`#section-${scrollToSection}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [isOpen, scrollToSection]);

  // Check if org requires NDA
  useEffect(() => {
    if (!isOpen) return;
    async function checkNdaSetting() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      if (!userData?.organization_id) return;
      const { data: org } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", userData.organization_id)
        .single();
      if ((org?.settings as any)?.require_nda) setNdaRequired(true);
    }
    checkNdaSetting();
  }, [isOpen, supabase]);

  // Load existing deal links
  useEffect(() => {
    if (!isOpen) return;
    async function loadLinks() {
      try {
        const res = await fetch(`/api/deals/${deal.id}/links`);
        if (res.ok) {
          const data = await res.json();
          const links = data.links || [];
          setExistingLinkIds(links.map((l: { id: string }) => l.id));
          setDealLinks(links.map((l: { link_type: string; url: string }) => ({
            link_type: l.link_type,
            url: l.url,
          })));
        }
      } catch {}
    }
    loadLinks();
  }, [isOpen, deal.id]);

  const [formData, setFormData] = useState({
    name: deal.name,
    company_name: deal.company_name || "",
    description: deal.description || "",
    target_raise: deal.target_raise ? deal.target_raise.toString() : "",
    min_check_size: deal.min_check_size ? deal.min_check_size.toString() : "",
    max_check_size: deal.max_check_size ? deal.max_check_size.toString() : "",
    fee_percent: deal.fee_percent?.toString() || "",
    carry_percent: deal.carry_percent?.toString() || "",
    status: deal.status,
    memo_url: deal.memo_url || "",
    created_date: deal.created_date || "",
    close_date: deal.close_date || "",
    investment_stage: deal.investment_stage || "",
    investment_type: deal.investment_type || "",
    founder_email: deal.founder_email || "",
    investor_update_frequency: deal.investor_update_frequency || "",
    access: deal.access || "public",
    sector: deal.sector || "",
    geography: deal.geography || "",
    investment_thesis: deal.investment_thesis || "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Upload NDA document if a new file was selected
      let ndaDocumentUrl: string | null | undefined = undefined;
      if (ndaFile) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: userData } = await supabase
          .from("users")
          .select("organization_id")
          .eq("id", user!.id)
          .single();

        const fileExt = ndaFile.name.split(".").pop();
        const filePath = `${userData!.organization_id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("nda-documents")
          .upload(filePath, ndaFile);

        if (uploadError) throw new Error(`NDA upload failed: ${uploadError.message}`);
        ndaDocumentUrl = filePath;
      }

      const body: Record<string, unknown> = {
        name: formData.name,
        company_name: formData.company_name || null,
        description: formData.description || null,
        target_raise: formData.target_raise ? parseFloat(formData.target_raise) : null,
        min_check_size: formData.min_check_size ? parseFloat(formData.min_check_size) : null,
        max_check_size: formData.max_check_size ? parseFloat(formData.max_check_size) : null,
        fee_percent: formData.fee_percent ? parseFloat(formData.fee_percent) : null,
        carry_percent: formData.carry_percent ? parseFloat(formData.carry_percent) : null,
        status: formData.status,
        created_date: formData.created_date || null,
        close_date: formData.close_date || null,
        investment_stage: formData.investment_stage || null,
        investment_type: formData.investment_type || null,
        founder_email: formData.founder_email || null,
        investor_update_frequency: formData.investor_update_frequency || null,
        access: formData.access,
        sector: formData.sector || null,
        geography: formData.geography || null,
        investment_thesis: formData.investment_thesis || null,
      };

      if (ndaDocumentUrl !== undefined) {
        body.nda_document_url = ndaDocumentUrl;
      }

      const response = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to update deal");
      }

      // Save deal links: delete all existing, re-insert current set
      for (const linkId of existingLinkIds) {
        await fetch(`/api/deals/${deal.id}/links`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkId }),
        });
      }
      for (const link of dealLinks) {
        if (link.url.trim()) {
          await fetch(`/api/deals/${deal.id}/links`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ link_type: link.link_type, url: link.url.trim() }),
          });
        }
      }

      router.refresh();
      onClose();
    } catch (error) {
      alert("Failed to update deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div ref={modalRef} className="relative glass-card text-foreground rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium">Edit Deal</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deal Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Deal Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
            />
          </div>

          {/* Investment Thesis */}
          <div>
            <label className="block text-sm font-medium mb-1">Investment Thesis</label>
            <textarea
              rows={2}
              value={formData.investment_thesis}
              onChange={(e) => setFormData({ ...formData, investment_thesis: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
              placeholder="Brief description of the investment thesis..."
            />
          </div>

          {/* Access + Sector + Geography */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Access</label>
              <select
                value={formData.access}
                onChange={(e) => setFormData({ ...formData, access: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sector</label>
              <select
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="">Select...</option>
                <option value="fintech">Fintech</option>
                <option value="healthcare">Healthcare</option>
                <option value="saas">SaaS</option>
                <option value="ai_ml">AI / ML</option>
                <option value="consumer">Consumer</option>
                <option value="enterprise">Enterprise</option>
                <option value="biotech">Biotech</option>
                <option value="climate">Climate</option>
                <option value="crypto">Crypto / Web3</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Geography</label>
              <select
                value={formData.geography}
                onChange={(e) => setFormData({ ...formData, geography: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="">Select...</option>
                <option value="us">United States</option>
                <option value="europe">Europe</option>
                <option value="asia">Asia</option>
                <option value="global">Global</option>
                <option value="latam">Latin America</option>
                <option value="mena">MENA</option>
                <option value="africa">Africa</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Created Date</label>
              <input
                type="date"
                value={formData.created_date}
                onChange={(e) => setFormData({ ...formData, created_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Close Date</label>
              <input
                type="date"
                value={formData.close_date}
                onChange={(e) => setFormData({ ...formData, close_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
          </div>

          {/* Investment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Investment Stage</label>
              <input
                type="text"
                value={formData.investment_stage}
                onChange={(e) => setFormData({ ...formData, investment_stage: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                placeholder="e.g., Series B"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Investment Type</label>
              <input
                type="text"
                value={formData.investment_type}
                onChange={(e) => setFormData({ ...formData, investment_type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                placeholder="e.g., Equity"
              />
            </div>
          </div>

          {/* Target Raise */}
          <div>
            <label className="block text-sm font-medium mb-1">Target Raise ($)</label>
            <CurrencyInput
              value={formData.target_raise}
              onChange={(val) => setFormData({ ...formData, target_raise: val })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              placeholder="e.g., 5000000 for $5M"
            />
          </div>

          {/* Check Size Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Min Check ($)</label>
              <CurrencyInput
                value={formData.min_check_size}
                onChange={(val) => setFormData({ ...formData, min_check_size: val })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Check ($)</label>
              <CurrencyInput
                value={formData.max_check_size}
                onChange={(val) => setFormData({ ...formData, max_check_size: val })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
          </div>

          {/* Deal Terms */}
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-medium mb-3">Deal Terms</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Management Fee (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.fee_percent}
                  onChange={(e) => setFormData({ ...formData, fee_percent: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="e.g., 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Carry (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.carry_percent}
                  onChange={(e) => setFormData({ ...formData, carry_percent: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="e.g., 20"
                />
              </div>
            </div>

            {/* Deal Links */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Deal Links</label>
              <DealLinksEditor links={dealLinks} onChange={setDealLinks} />
            </div>
          </div>

          {/* NDA Upload (only when org requires NDA) */}
          {ndaRequired && (
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3">NDA Document</h3>
              {deal.nda_document_url && !ndaFile && (
                <div className="flex items-center gap-3 px-3 py-2 border border-border rounded-lg bg-secondary/30 mb-3">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate flex-1">Current NDA uploaded</span>
                </div>
              )}
              {ndaFile ? (
                <div className="flex items-center gap-3 px-3 py-2 border border-border rounded-lg bg-secondary/30">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">{ndaFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setNdaFile(null)}
                    className="p-1 hover:bg-secondary rounded transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-all">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {deal.nda_document_url ? "Replace NDA document" : "Upload NDA document"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setNdaFile(file);
                    }}
                  />
                </label>
              )}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Investor Updates */}
          <div id="section-investor-updates" className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-medium mb-3">Investor Updates</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Founder/Company Email</label>
                <input
                  type="email"
                  value={formData.founder_email}
                  onChange={(e) => setFormData({ ...formData, founder_email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="founder@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Update Frequency</label>
                <select
                  value={formData.investor_update_frequency}
                  onChange={(e) => setFormData({ ...formData, investor_update_frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="">Not set</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annual">Semi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
