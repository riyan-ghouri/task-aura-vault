CREATE TABLE public.signup_otps (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.signup_otps TO service_role;

ALTER TABLE public.signup_otps ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (via supabaseAdmin) can access.