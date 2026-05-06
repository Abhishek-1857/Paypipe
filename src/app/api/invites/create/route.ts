import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const companyName: string | undefined = body.company_name?.trim() || undefined;

  const serviceClient = createServiceClient();

  const { data: invite, error } = await serviceClient
    .from("contractor_invites")
    .insert({
      owner_id: user.id,
      owner_email: user.email!,
      company_name: companyName || null,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
    .select("id, token, company_name, used, created_at, expires_at")
    .single();

  if (error || !invite) {
    console.error("Failed to create invite:", error);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  const inviteUrl = `${process.env.NEXT_PUBLIC_URL}/invite/${invite.token}`;

  return NextResponse.json({ invite: { ...invite, invite_url: inviteUrl } });
}
