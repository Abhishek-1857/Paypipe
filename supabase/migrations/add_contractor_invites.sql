create table contractor_invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  owner_id uuid references auth.users not null,
  owner_email text not null,
  company_name text,
  used boolean default false,
  contractor_id uuid references contractors,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days'
);

alter table contractor_invites enable row level security;

-- Owner can fully manage their own invites
create policy "owners can manage their invites"
  on contractor_invites for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Public can read any invite by token (for the onboarding page)
create policy "public can read invites"
  on contractor_invites for select
  using (true);
