
-- enum for verification status
create type public.verification_status as enum ('pending', 'verified', 'rejected', 'expired');

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'gooddollar',
  wallet_address text,
  status public.verification_status not null default 'pending',
  verified_at timestamptz,
  expires_at timestamptz,
  last_checked_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index verifications_user_id_idx on public.verifications(user_id);
create index verifications_wallet_idx on public.verifications(lower(wallet_address));

alter table public.verifications enable row level security;

create policy "Owners can view their verification"
on public.verifications for select
to authenticated
using (auth.uid() = user_id);

create policy "Owners can insert their verification"
on public.verifications for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Owners can update their verification"
on public.verifications for update
to authenticated
using (auth.uid() = user_id);

create policy "Admins and moderators can view all verifications"
on public.verifications for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin')
  or public.has_role(auth.uid(), 'moderator')
);

create trigger verifications_set_updated_at
before update on public.verifications
for each row execute function public.set_updated_at();

-- Computed effective status that flips to 'expired' when expires_at has passed.
create or replace function public.effective_verification_status(_status public.verification_status, _expires_at timestamptz)
returns public.verification_status
language sql
immutable
as $$
  select case
    when _status = 'verified' and _expires_at is not null and _expires_at < now() then 'expired'::public.verification_status
    else _status
  end
$$;
