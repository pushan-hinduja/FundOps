"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LPContact,
  LPDocument,
  LPWiringInstructions,
  DealLPRelationshipWithDeal,
  DocumentType,
} from "@/lib/supabase/types";
import { LPProfileEditor } from "@/components/lp/LPProfileEditor";
import { LPDocumentsSection } from "@/components/lp/LPDocumentsSection";
import { LPWiringInstructions as LPWiringComponent } from "@/components/lp/LPWiringInstructions";
import { LPDealTermsEditor } from "@/components/lp/LPDealTermsEditor";

interface LPDetailClientProps {
  lp: LPContact;
  documents: LPDocument[];
  wiringInstructions: LPWiringInstructions[];
  dealRelationships: DealLPRelationshipWithDeal[];
}

export function LPDetailClient({
  lp,
  documents: initialDocuments,
  wiringInstructions: initialWiring,
  dealRelationships: initialRelationships,
}: LPDetailClientProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [wiringInstructions, setWiringInstructions] = useState(initialWiring);
  const [dealRelationships, setDealRelationships] = useState(initialRelationships);

  // LP Profile update
  const handleUpdateProfile = async (updates: Partial<LPContact>) => {
    const response = await fetch(`/api/lps/${lp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error("Failed to update profile");
    }

    router.refresh();
  };

  // Document handlers
  const handleAddDocument = async (doc: {
    document_type: DocumentType;
    document_name: string;
    file_path?: string;
    expiration_date?: string;
  }) => {
    const response = await fetch(`/api/lps/${lp.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });

    if (!response.ok) {
      throw new Error("Failed to add document");
    }

    const newDoc = await response.json();
    setDocuments([newDoc, ...documents]);
  };

  const handleUpdateDocument = async (
    documentId: string,
    updates: Partial<LPDocument>
  ) => {
    const response = await fetch(`/api/lps/${lp.id}/documents`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId, ...updates }),
    });

    if (!response.ok) {
      throw new Error("Failed to update document");
    }

    const updatedDoc = await response.json();
    setDocuments(
      documents.map((d) => (d.id === documentId ? updatedDoc : d))
    );
  };

  const handleDeleteDocument = async (documentId: string) => {
    const response = await fetch(
      `/api/lps/${lp.id}/documents?document_id=${documentId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete document");
    }

    setDocuments(documents.filter((d) => d.id !== documentId));
  };

  // Wiring handlers
  const handleAddWiring = async (wiring: {
    account_label: string;
    bank_name: string;
    account_name: string;
    account_number: string;
    routing_number?: string;
    swift_code?: string;
    iban?: string;
    bank_address?: string;
    intermediary_bank?: string;
    special_instructions?: string;
    is_primary?: boolean;
  }) => {
    const response = await fetch(`/api/lps/${lp.id}/wiring`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wiring),
    });

    if (!response.ok) {
      throw new Error("Failed to add wiring instructions");
    }

    const newWiring = await response.json();

    // If set as primary, update other wiring instructions
    if (wiring.is_primary) {
      setWiringInstructions([
        newWiring,
        ...wiringInstructions.map((w) => ({ ...w, is_primary: false })),
      ]);
    } else {
      setWiringInstructions([newWiring, ...wiringInstructions]);
    }
  };

  const handleUpdateWiring = async (
    wiringId: string,
    updates: Partial<LPWiringInstructions>
  ) => {
    const response = await fetch(`/api/lps/${lp.id}/wiring`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wiring_id: wiringId, ...updates }),
    });

    if (!response.ok) {
      throw new Error("Failed to update wiring instructions");
    }

    const updatedWiring = await response.json();

    // If set as primary, update other wiring instructions
    if (updates.is_primary) {
      setWiringInstructions(
        wiringInstructions.map((w) =>
          w.id === wiringId ? updatedWiring : { ...w, is_primary: false }
        )
      );
    } else {
      setWiringInstructions(
        wiringInstructions.map((w) => (w.id === wiringId ? updatedWiring : w))
      );
    }
  };

  const handleDeleteWiring = async (wiringId: string) => {
    const response = await fetch(
      `/api/lps/${lp.id}/wiring?wiring_id=${wiringId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete wiring instructions");
    }

    setWiringInstructions(wiringInstructions.filter((w) => w.id !== wiringId));
  };

  // Deal terms handler
  const handleUpdateTerms = async (
    relationshipId: string,
    updates: Partial<DealLPRelationshipWithDeal>
  ) => {
    // Find the relationship to get the deal_id
    const relationship = dealRelationships.find((r) => r.id === relationshipId);
    if (!relationship) {
      throw new Error("Relationship not found");
    }

    const response = await fetch(
      `/api/deals/${relationship.deal_id}/allocations`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_id: relationshipId, ...updates }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update terms");
    }

    const updatedRelationship = await response.json();
    setDealRelationships(
      dealRelationships.map((r) =>
        r.id === relationshipId ? { ...r, ...updatedRelationship } : r
      )
    );
  };

  return (
    <>
      <LPProfileEditor lp={lp} onUpdate={handleUpdateProfile} />

      <LPDocumentsSection
        lpId={lp.id}
        documents={documents}
        onAddDocument={handleAddDocument}
        onUpdateDocument={handleUpdateDocument}
        onDeleteDocument={handleDeleteDocument}
      />

      <LPWiringComponent
        lpId={lp.id}
        wiringInstructions={wiringInstructions}
        onAddWiring={handleAddWiring}
        onUpdateWiring={handleUpdateWiring}
        onDeleteWiring={handleDeleteWiring}
      />

      <LPDealTermsEditor
        relationships={dealRelationships}
        onUpdateTerms={handleUpdateTerms}
      />
    </>
  );
}
