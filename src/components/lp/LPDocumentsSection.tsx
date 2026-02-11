"use client";

import { useState } from "react";
import {
  LPDocument,
  DocumentType,
  DocumentStatus,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
} from "@/lib/supabase/types";
import {
  FileText,
  Upload,
  Plus,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LPDocumentsSectionProps {
  lpId: string;
  documents: LPDocument[];
  onAddDocument: (doc: {
    document_type: DocumentType;
    document_name: string;
    file_path?: string;
    expiration_date?: string;
  }) => Promise<void>;
  onUpdateDocument: (
    documentId: string,
    updates: Partial<LPDocument>
  ) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
}

export function LPDocumentsSection({
  lpId,
  documents,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
}: LPDocumentsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newDoc, setNewDoc] = useState<{
    document_type: DocumentType;
    document_name: string;
    expiration_date: string;
  }>({
    document_type: "subscription_agreement",
    document_name: "",
    expiration_date: "",
  });

  const documentTypes: DocumentType[] = [
    "subscription_agreement",
    "accreditation_letter",
    "tax_form_w9",
    "tax_form_w8",
    "id_passport",
    "kyc_documents",
    "other",
  ];

  const documentStatuses: DocumentStatus[] = [
    "pending",
    "uploaded",
    "under_review",
    "approved",
    "rejected",
    "expired",
  ];

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case "approved":
        return "bg-secondary text-green-600";
      case "uploaded":
      case "under_review":
        return "bg-secondary text-yellow-600";
      case "rejected":
      case "expired":
        return "bg-secondary text-red-600";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expirationDate = new Date(date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expirationDate <= thirtyDaysFromNow && expirationDate > new Date();
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) <= new Date();
  };

  const handleAddDocument = async () => {
    if (!newDoc.document_name.trim()) return;

    setIsSaving(true);
    try {
      await onAddDocument({
        document_type: newDoc.document_type,
        document_name: newDoc.document_name,
        expiration_date: newDoc.expiration_date || undefined,
      });
      setNewDoc({
        document_type: "subscription_agreement",
        document_name: "",
        expiration_date: "",
      });
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to add document:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (docId: string, status: DocumentStatus) => {
    try {
      await onUpdateDocument(docId, { status });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await onDeleteDocument(docId);
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  return (
    <div className="glass-card rounded-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-lg font-medium">Documents & KYC</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Document
          </button>
        )}
      </div>

      <div className="p-6">
      {/* Add New Document Form */}
      {isAdding && (
        <div className="mb-4 p-4 bg-secondary/30 rounded-xl border border-border">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Document Type
              </label>
              <select
                value={newDoc.document_type}
                onChange={(e) =>
                  setNewDoc({
                    ...newDoc,
                    document_type: e.target.value as DocumentType,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {DOCUMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Document Name
              </label>
              <input
                type="text"
                value={newDoc.document_name}
                onChange={(e) =>
                  setNewDoc({ ...newDoc, document_name: e.target.value })
                }
                placeholder="e.g., 2024 Subscription Agreement"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Expiration Date
              </label>
              <input
                type="date"
                value={newDoc.expiration_date}
                onChange={(e) =>
                  setNewDoc({ ...newDoc, expiration_date: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddDocument}
              disabled={isSaving || !newDoc.document_name.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Add
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{doc.document_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_TYPE_LABELS[doc.document_type]}
                    {doc.expiration_date && (
                      <>
                        {" "}
                        &middot; Expires{" "}
                        {new Date(doc.expiration_date).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </div>
                {/* Expiration warnings */}
                {isExpired(doc.expiration_date) && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-secondary text-red-600 rounded-lg">
                    <AlertTriangle className="w-3 h-3" />
                    Expired
                  </span>
                )}
                {!isExpired(doc.expiration_date) &&
                  isExpiringSoon(doc.expiration_date) && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-secondary text-yellow-600 rounded-lg">
                      <AlertTriangle className="w-3 h-3" />
                      Expiring soon
                    </span>
                  )}
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={doc.status}
                  onChange={(e) =>
                    handleStatusChange(doc.id, e.target.value as DocumentStatus)
                  }
                  className={`select-inline px-2.5 py-1 text-xs font-medium rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 ${getStatusColor(
                    doc.status
                  )}`}
                >
                  {documentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {DOCUMENT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
