import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/lps/[id]/wiring - Get LP wiring instructions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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
      .eq("id", id)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!lp) {
      return NextResponse.json({ error: "LP not found" }, { status: 404 });
    }

    const { data: wiringInstructions, error } = await supabase
      .from("lp_wiring_instructions")
      .select("*")
      .eq("lp_contact_id", id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching wiring instructions:", error);
      return NextResponse.json(
        { error: "Failed to fetch wiring instructions" },
        { status: 500 }
      );
    }

    return NextResponse.json(wiringInstructions);
  } catch (error) {
    console.error("Error fetching wiring instructions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/lps/[id]/wiring - Create new wiring instructions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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
      .eq("id", id)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!lp) {
      return NextResponse.json({ error: "LP not found" }, { status: 404 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.account_label || !body.bank_name || !body.account_name || !body.account_number) {
      return NextResponse.json(
        { error: "account_label, bank_name, account_name, and account_number are required" },
        { status: 400 }
      );
    }

    // If setting as primary, unset existing primary first
    if (body.is_primary) {
      await supabase
        .from("lp_wiring_instructions")
        .update({ is_primary: false })
        .eq("lp_contact_id", id)
        .eq("is_primary", true);
    }

    const { data: wiring, error } = await supabase
      .from("lp_wiring_instructions")
      .insert({
        lp_contact_id: id,
        account_label: body.account_label,
        bank_name: body.bank_name,
        account_name: body.account_name,
        account_number: body.account_number,
        routing_number: body.routing_number || null,
        swift_code: body.swift_code || null,
        iban: body.iban || null,
        bank_address: body.bank_address || null,
        intermediary_bank: body.intermediary_bank || null,
        special_instructions: body.special_instructions || null,
        is_primary: body.is_primary || false,
        is_verified: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating wiring instructions:", error);
      return NextResponse.json(
        { error: "Failed to create wiring instructions" },
        { status: 500 }
      );
    }

    return NextResponse.json(wiring, { status: 201 });
  } catch (error) {
    console.error("Error creating wiring instructions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/lps/[id]/wiring - Update wiring instructions
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    if (!body.wiring_id) {
      return NextResponse.json(
        { error: "wiring_id is required" },
        { status: 400 }
      );
    }

    // Verify LP belongs to organization
    const { data: lp } = await supabase
      .from("lp_contacts")
      .select("id")
      .eq("id", id)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!lp) {
      return NextResponse.json({ error: "LP not found" }, { status: 404 });
    }

    // If setting as primary, unset existing primary first
    if (body.is_primary) {
      await supabase
        .from("lp_wiring_instructions")
        .update({ is_primary: false })
        .eq("lp_contact_id", id)
        .eq("is_primary", true)
        .neq("id", body.wiring_id);
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "account_label",
      "bank_name",
      "account_name",
      "account_number",
      "routing_number",
      "swift_code",
      "iban",
      "bank_address",
      "intermediary_bank",
      "special_instructions",
      "is_primary",
      "is_verified",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // If verifying, set verified info
    if (body.is_verified === true) {
      updateData.verified_by = user.id;
      updateData.verified_at = new Date().toISOString();
    }

    const { data: wiring, error } = await supabase
      .from("lp_wiring_instructions")
      .update(updateData)
      .eq("id", body.wiring_id)
      .eq("lp_contact_id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating wiring instructions:", error);
      return NextResponse.json(
        { error: "Failed to update wiring instructions" },
        { status: 500 }
      );
    }

    return NextResponse.json(wiring);
  } catch (error) {
    console.error("Error updating wiring instructions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/lps/[id]/wiring - Delete wiring instructions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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
    const wiringId = searchParams.get("wiring_id");

    if (!wiringId) {
      return NextResponse.json(
        { error: "wiring_id is required" },
        { status: 400 }
      );
    }

    // Verify LP belongs to organization
    const { data: lp } = await supabase
      .from("lp_contacts")
      .select("id")
      .eq("id", id)
      .eq("organization_id", userData.organization_id)
      .single();

    if (!lp) {
      return NextResponse.json({ error: "LP not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("lp_wiring_instructions")
      .delete()
      .eq("id", wiringId)
      .eq("lp_contact_id", id);

    if (error) {
      console.error("Error deleting wiring instructions:", error);
      return NextResponse.json(
        { error: "Failed to delete wiring instructions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting wiring instructions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
