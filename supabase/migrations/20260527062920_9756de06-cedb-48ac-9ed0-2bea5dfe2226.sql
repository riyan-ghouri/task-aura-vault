ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS age integer;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_age_range CHECK (age IS NULL OR (age >= 13 AND age <= 120));