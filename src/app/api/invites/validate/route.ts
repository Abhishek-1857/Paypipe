import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, reason: "missing_token" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: invite, error } = await supabase
    .from("contractor_invites")
    .select("id, company_name, owner_email, used, expires_at")
    .eq("token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ valid: false, reason: "not_found" });
  }

  if (invite.used) {
    return NextResponse.json({ valid: false, reason: "used" });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }

  return NextResponse.json({
    valid: true,
    company_name: invite.company_name,
    owner_email: invite.owner_email,
  });
}
