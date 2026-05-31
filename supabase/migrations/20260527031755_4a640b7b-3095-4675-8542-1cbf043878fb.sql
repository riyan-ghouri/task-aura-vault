
-- app_settings
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update settings" ON public.app_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));

INSERT INTO public.app_settings(key,value) VALUES ('referral_reward_cusd', '0.10'::jsonb);

-- profiles
ALTER TABLE public.profiles
  ADD COLUMN referral_code text UNIQUE,
  ADD COLUMN referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- backfill codes for existing users
UPDATE public.profiles SET referral_code = upper(substr(replace(id::text,'-',''),1,8)) WHERE referral_code IS NULL;

-- referrals
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_cusd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own referrals" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id);
CREATE POLICY "Admins view all referrals" ON public.referrals FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update referrals" ON public.referrals FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

-- updated handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _ref_code text;
  _referrer_id uuid;
  _reward numeric;
  _new_code text;
BEGIN
  _new_code := upper(substr(replace(NEW.id::text,'-',''),1,8));
  INSERT INTO public.profiles (id, email, display_name, avatar_url, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    _new_code
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  IF lower(NEW.email) = 'riyanghouri353@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  _ref_code := NEW.raw_user_meta_data->>'referral_code';
  IF _ref_code IS NOT NULL AND length(_ref_code) > 0 THEN
    SELECT id INTO _referrer_id FROM public.profiles WHERE referral_code = upper(_ref_code) AND id <> NEW.id LIMIT 1;
    IF _referrer_id IS NOT NULL THEN
      UPDATE public.profiles SET referred_by = _referrer_id WHERE id = NEW.id;
      SELECT COALESCE((value)::text::numeric, 0) INTO _reward FROM public.app_settings WHERE key='referral_reward_cusd';
      INSERT INTO public.referrals(referrer_id, referred_user_id, reward_cusd)
        VALUES (_referrer_id, NEW.id, COALESCE(_reward, 0))
        ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
