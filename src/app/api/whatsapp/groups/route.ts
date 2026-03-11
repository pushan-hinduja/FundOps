import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getGatewayHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.WA_GATEWAY_SECRET) {
    headers["Authorization"] = `Bearer ${process.env.WA_GATEWAY_SECRET}`;
  }
  return headers;
}

// GET — list all groups with selection state
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gatewayUrl = process.env.WA_GATEWAY_URL;
  if (!gatewayUrl) {
    return NextResponse.json(
      { error: "WhatsApp gateway not configured" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${gatewayUrl}/groups`, {
      headers: await getGatewayHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json(
        { error: data.error || "Failed to fetch groups" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "WhatsApp gateway is not running" },
      { status: 503 }
    );
  }
}

// POST — update which groups to monitor
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gatewayUrl = process.env.WA_GATEWAY_URL;
  if (!gatewayUrl) {
    return NextResponse.json(
      { error: "WhatsApp gateway not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const res = await fetch(`${gatewayUrl}/groups`, {
      method: "POST",
      headers: await getGatewayHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "WhatsApp gateway is not running" },
      { status: 503 }
    );
  }
}
