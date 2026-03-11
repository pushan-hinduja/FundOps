import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const headers: Record<string, string> = {};
    if (process.env.WA_GATEWAY_SECRET) {
      headers["Authorization"] = `Bearer ${process.env.WA_GATEWAY_SECRET}`;
    }

    const res = await fetch(`${gatewayUrl}/qr`, { headers });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "WhatsApp gateway is not running" },
      { status: 503 }
    );
  }
}
