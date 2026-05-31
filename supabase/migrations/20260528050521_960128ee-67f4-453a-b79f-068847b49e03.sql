
-- Extend tasks with verification fields
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS required_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS verification_code text,
  ADD COLUMN IF NOT EXISTS min_image_width int NOT NULL DEFAULT 480,
  ADD COLUMN IF NOT EXISTS min_image_height int NOT NULL DEFAULT 480;

-- Extend task_submissions with fraud-analysis fields
ALTER TABLE public.task_submissions
  ADD COLUMN IF NOT EXISTS image_sha256 text,
  ADD COLUMN IF NOT EXISTS image_phash bigint,
  ADD COLUMN IF NOT EXISTS image_width int,
  ADD COLUMN IF NOT EXISTS image_height int,
  ADD COLUMN IF NOT EXISTS image_bytes int,
  ADD COLUMN IF NOT EXISTS image_mime text,
  ADD COLUMN IF NOT EXISTS ocr_text text,
  ADD COLUMN IF NOT EXISTS ocr_matched_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ocr_missing_keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fraud_score int,
  ADD COLUMN IF NOT EXISTS fraud_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS client_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_decision text;

ALTER TABLE public.task_submissions
  DROP CONSTRAINT IF EXISTS task_submissions_auto_decision_check;
ALTER TABLE public.task_submissions
  ADD CONSTRAINT task_submissions_auto_decision_check
  CHECK (auto_decision IS NULL OR auto_decision IN ('auto_reject','review','low_risk'));

CREATE INDEX IF NOT EXISTS idx_task_submissions_sha256 ON public.task_submissions(image_sha256);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status_score ON public.task_submissions(status, fraud_score);

-- Submission hashes (dedupe index across all users/tasks)
CREATE TABLE IF NOT EXISTS public.submission_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  user_id uuid NOT NULL,
  task_id uuid NOT NULL,
  sha256 text NOT NULL,
  phash bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_submission_hashes_sha256 ON public.submission_hashes(sha256);
CREATE INDEX IF NOT EXISTS idx_submission_hashes_task_phash ON public.submission_hashes(task_id, phash);
CREATE INDEX IF NOT EXISTS idx_submission_hashes_user_sha ON public.submission_hashes(user_id, sha256);

GRANT SELECT ON public.submission_hashes TO authenticated;
GRANT ALL ON public.submission_hashes TO service_role;
ALTER TABLE public.submission_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all submission hashes"
  ON public.submission_hashes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Banned devices
CREATE TABLE IF NOT EXISTS public.banned_devices (
  device_fp_hash text PRIMARY KEY,
  reason text,
  banned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banned_devices TO authenticated;
GRANT ALL ON public.banned_devices TO service_role;
ALTER TABLE public.banned_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view banned devices"
  ON public.banned_devices FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert banned devices"
  ON public.banned_devices FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete banned devices"
  ON public.banned_devices FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Realtime on task_submissions
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.task_submissions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
