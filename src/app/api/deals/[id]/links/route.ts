import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("deal_links")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ links: data || [] });
  } catch (error) {
    console.error("Get deal links error:", error);
    return NextResponse.json({ error: "Failed to get deal links" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { link_type, url } = await request.json();

    if (!link_type || !url) {
      return NextResponse.json({ error: "link_type and url are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("deal_links")
      .insert({ deal_id: dealId, link_type, url })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ link: data }, { status: 201 });
  } catch (error) {
    console.error("Create deal link error:", error);
    return NextResponse.json({ error: "Failed to create deal link" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { linkId } = await request.json();
    if (!linkId) return NextResponse.json({ error: "linkId is required" }, { status: 400 });

    const { error } = await supabase
      .from("deal_links")
      .delete()
      .eq("id", linkId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete deal link error:", error);
    return NextResponse.json({ error: "Failed to delete deal link" }, { status: 500 });
  }
}
