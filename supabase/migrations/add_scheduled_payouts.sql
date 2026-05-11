-- Scheduled payouts: founder sets a recurring schedule, pays manually each month

create table scheduled_payouts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  contractor_id uuid not null references contractors(id),
  amount_usd numeric not null,
  day_of_month integer not null check (day_of_month >= 1 and day_of_month <= 28),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  last_paid_date date,
  next_due_date date not null,
  created_at timestamptz not null default now()
);

create table scheduled_payout_payments (
  id uuid primary key default gen_random_uuid(),
  scheduled_payout_id uuid not null references scheduled_payouts(id) on delete cascade,
  payout_id uuid references payouts(id),
  due_date date not null,
  paid_date timestamptz,
  status text not null default 'pending' check (status in ('pending', 'paid', 'skipped')),
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_scheduled_payouts_owner on scheduled_payouts(owner_id);
create index idx_scheduled_payouts_status on scheduled_payouts(status);
create index idx_scheduled_payouts_next_due on scheduled_payouts(next_due_date);
create index idx_spp_scheduled_payout on scheduled_payout_payments(scheduled_payout_id);

-- RLS
alter table scheduled_payouts enable row level security;
alter table scheduled_payout_payments enable row level security;

create policy "owners can manage their scheduled payouts"
  on scheduled_payouts for all
  using (owner_id = auth.uid());

create policy "owners can view their scheduled payout payments"
  on scheduled_payout_payments for all
  using (
    exists (
      select 1 from scheduled_payouts sp
      where sp.id = scheduled_payout_payments.scheduled_payout_id
        and sp.owner_id = auth.uid()
    )
  );
