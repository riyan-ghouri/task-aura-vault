
-- Admin hot wallet (singleton)
CREATE TABLE public.admin_wallets (
  id text PRIMARY KEY DEFAULT 'default',
  address text,
  encrypted_private_key text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.admin_wallets TO authenticated;
GRANT ALL ON public.admin_wallets TO service_role;

ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view admin wallet" ON public.admin_wallets
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert admin wallet" ON public.admin_wallets
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update admin wallet" ON public.admin_wallets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Profile flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_bonus_credited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_auto_withdrawal_done boolean NOT NULL DEFAULT false;

-- Withdrawal tracking
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS is_auto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS error text;

-- Payout rule settings
INSERT INTO public.app_settings(key, value) VALUES
  ('signup_bonus_usdt', '0.05'::jsonb),
  ('first_withdrawal_amount_usdt', '0.05'::jsonb),
  ('min_withdrawal_usdt', '1'::jsonb),
  ('min_tasks_for_withdrawal', '100'::jsonb)
ON CONFLICT (key) DO NOTHING;
