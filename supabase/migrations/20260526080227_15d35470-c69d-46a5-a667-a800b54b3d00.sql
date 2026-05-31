
create or replace function public.effective_verification_status(_status public.verification_status, _expires_at timestamptz)
returns public.verification_status
language sql
immutable
set search_path = public
as $$
  select case
    when _status = 'verified' and _expires_at is not null and _expires_at < now() then 'expired'::public.verification_status
    else _status
  end
$$;
