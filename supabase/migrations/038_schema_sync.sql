-- ============================================================
-- Migration 038: Schema sync — adds all missing tables/columns
-- Safe to run on any existing install — uses IF NOT EXISTS.
-- Covers: photographers.locale, questionnaire_submissions,
--         projects reminder columns, admin RLS policy,
--         and any other gaps since migration 037.
-- ============================================================

-- ============================================================
-- 1. PHOTOGRAPHERS: locale field
--    Used in portal to determine language (photographer?.locale)
-- ============================================================
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS locale text DEFAULT 'de';

-- ============================================================
-- 2. QUESTIONNAIRE SUBMISSIONS table
--    Used in client portal to check if questionnaire was filled
-- ============================================================
CREATE TABLE IF NOT EXISTS questionnaire_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  questionnaire_id uuid REFERENCES questionnaires(id) ON DELETE SET NULL,
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  answers         jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at    timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_submissions_project_id
  ON questionnaire_submissions(project_id);

CREATE INDEX IF NOT EXISTS idx_questionnaire_submissions_photographer_id
  ON questionnaire_submissions(photographer_id);

ALTER TABLE questionnaire_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'questionnaire_submissions'
      AND policyname = 'questionnaire_submissions_select_own'
  ) THEN
    CREATE POLICY "questionnaire_submissions_select_own"
      ON questionnaire_submissions FOR SELECT
      USING (photographer_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'questionnaire_submissions'
      AND policyname = 'questionnaire_submissions_insert_public'
  ) THEN
    CREATE POLICY "questionnaire_submissions_insert_public"
      ON questionnaire_submissions FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'questionnaire_submissions'
      AND policyname = 'questionnaire_submissions_select_public'
  ) THEN
    CREATE POLICY "questionnaire_submissions_select_public"
      ON questionnaire_submissions FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================================
-- 3. PROJECTS: reminder tracking columns (from migration 030/036)
--    Safe re-run — IF NOT EXISTS
-- ============================================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS reminder_7d_sent   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_1d_sent   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminders_disabled boolean DEFAULT false;

-- ============================================================
-- 4. ADMIN RLS POLICY (from migration 037)
--    Allow admin user to read all photographers
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'photographers'
      AND policyname = 'Admin can read all photographers'
  ) THEN
    CREATE POLICY "Admin can read all photographers"
      ON photographers
      FOR SELECT
      USING (
        auth.uid() = '3f3a14b9-3bb2-40fa-b0eb-5fea92f67429'::uuid
      );
  END IF;
END $$;

-- ============================================================
-- 5. PHOTOGRAPHERS: stripe_sub_status (for billing page)
-- ============================================================
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS stripe_sub_status text DEFAULT NULL;

-- ============================================================
-- 6. PHOTOGRAPHERS: trial_ends_at (for plan limits)
-- ============================================================
ALTER TABLE photographers
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT NULL;
