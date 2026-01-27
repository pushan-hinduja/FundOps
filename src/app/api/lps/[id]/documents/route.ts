import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DocumentType, DocumentStatus } from "@/lib/supabase/types";

// GET /api/lps/[id]/documents - Get LP documents
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    // Verify LP belongs to organization
    const { data: lp } = await supabase
      .from("lp_contacts")
      .select("id")
      .eq("id", params.id)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!lp) {
      return NextResponse.json({ error: "LP not found" }, { status: 404 });
    }

    const { data: documents, error } = await supabase
      .from("lp_documents")
      .select("*")
      .eq("lp_contact_id", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/lps/[id]/documents - Create new document
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    // Verify LP belongs to organization
    const { data: lp } = await supabase
      .from("lp_contacts")
      .select("id")
      .eq("id", params.id)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!lp) {
      return NextResponse.json({ error: "LP not found" }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.document_type || !body.document_name) {
      return NextResponse.json(
        { error: "document_type and document_name are required" },
        { status: 400 }
      );
    }

    const validDocumentTypes: DocumentType[] = [
      "subscription_agreement",
      "accreditation_letter",
      "tax_form_w9",
      "tax_form_w8",
      "id_passport",
      "kyc_documents",
      "other",
    ];

    if (!validDocumentTypes.includes(body.document_type)) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      );
    }

    const { data: document, error } = await supabase
      .from("lp_documents")
      .insert({
        lp_contact_id: params.id,
        document_type: body.document_type,
        document_name: body.document_name,
        file_path: body.file_path || null,
        status: body.status || "pending",
        expiration_date: body.expiration_date || null,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating document:", error);
      return NextResponse.json(
        { error: "Failed to create document" },
        { status: 500 }
      );
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/lps/[id]/documents - Update document
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.document_id) {
      return NextResponse.json(
        { error: "document_id is required" },
        { status: 400 }
      );
    }

    // Verify LP belongs to organization
    const { data: lp } = await supabase
      .from("lp_contacts")
      .select("id")
      .eq("id", params.id)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!lp) {
      return NextResponse.json({ error: "LP not found" }, { status: 404 });
    }

    const validDocumentStatuses: DocumentStatus[] = [
      "pending",
      "uploaded",
      "under_review",
      "approved",
      "rejected",
      "expired",
    ];

    if (body.status && !validDocumentStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid document status" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "document_name",
      "file_path",
      "status",
      "expiration_date",
      "notes",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // If status is being changed to approved, set verified info
    if (body.status === "approved") {
      updateData.verified_by = user.id;
      updateData.verified_at = new Date().toISOString();
    }

    const { data: document, error } = await supabase
      .from("lp_documents")
      .update(updateData)
      .eq("id", body.document_id)
      .eq("lp_contact_id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating document:", error);
      return NextResponse.json(
        { error: "Failed to update document" },
        { status: 500 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/lps/[id]/documents - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("document_id");

    if (!documentId) {
      return NextResponse.json(
        { error: "document_id is required" },
        { status: 400 }
      );
    }

    // Verify LP belongs to organization
    const { data: lp } = await supabase
      .from("lp_contacts")
      .select("id")
      .eq("id", params.id)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!lp) {
      return NextResponse.json({ error: "LP not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("lp_documents")
      .delete()
      .eq("id", documentId)
      .eq("lp_contact_id", params.id);

    if (error) {
      console.error("Error deleting document:", error);
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
