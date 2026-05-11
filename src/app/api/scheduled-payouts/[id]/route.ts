import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await request.json();

  if (!["pause", "resume", "cancel"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const statusMap: Record<string, string> = {
    pause: "paused",
    resume: "active",
    cancel: "cancelled",
  };

  const { data: schedule, error } = await supabase
    .from("scheduled_payouts")
    .update({ status: statusMap[action] })
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error || !schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  return NextResponse.json(schedule);
}
