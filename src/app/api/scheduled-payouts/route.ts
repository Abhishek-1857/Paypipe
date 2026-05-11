import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: schedules, error } = await supabase
    .from("scheduled_payouts")
    .select("*, contractors(id, name, email, solana_wallet)")
    .neq("status", "cancelled")
    .eq("owner_id", user.id)
    .order("next_due_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scheduleIds = (schedules || []).map((s) => s.id);

  const payments: Record<string, unknown[]> = {};
  if (scheduleIds.length > 0) {
    const { data: allPayments } = await supabase
      .from("scheduled_payout_payments")
      .select("*")
      .in("scheduled_payout_id", scheduleIds)
      .order("due_date", { ascending: false });

    for (const p of allPayments || []) {
      const key = p.scheduled_payout_id as string;
      if (!payments[key]) payments[key] = [];
      payments[key].push(p);
    }
  }

  const result = (schedules || []).map((s) => ({
    ...s,
    payments: payments[s.id] || [],
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contractorId, amountUsd, dayOfMonth } = await request.json();

  if (!contractorId || !amountUsd || amountUsd < 1 || amountUsd > 10) {
    return NextResponse.json({ error: "Invalid amount (must be $1-$10)" }, { status: 400 });
  }

  if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 28) {
    return NextResponse.json({ error: "Day must be 1-28" }, { status: 400 });
  }

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("id", contractorId)
    .single();

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const today = new Date();
  const todayDay = today.getDate();
  let nextDueDate: Date;

  if (todayDay <= dayOfMonth) {
    nextDueDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  } else {
    nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
  }

  const nextDueDateStr = nextDueDate.toISOString().split("T")[0];

  const serviceClient = createServiceClient();

  const { data: schedule, error: schedError } = await serviceClient
    .from("scheduled_payouts")
    .insert({
      owner_id: user.id,
      contractor_id: contractorId,
      amount_usd: amountUsd,
      day_of_month: dayOfMonth,
      next_due_date: nextDueDateStr,
    })
    .select("*, contractors(id, name, email, solana_wallet)")
    .single();

  if (schedError || !schedule) {
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }

  await serviceClient.from("scheduled_payout_payments").insert({
    scheduled_payout_id: schedule.id,
    due_date: nextDueDateStr,
    status: "pending",
  });

  return NextResponse.json(schedule);
}
