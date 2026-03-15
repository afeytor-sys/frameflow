-- Invite codes for free trial periods
CREATE TABLE IF NOT EXISTS invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  plan text NOT NULL DEFAULT 'pro',
  months_free integer NOT NULL DEFAULT 6,
  max_uses integer NOT NULL DEFAULT 1,
  use_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Track who used which code
CREATE TABLE IF NOT EXISTS invite_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid REFERENCES invite_codes(id),
  photographer_id uuid NOT NULL,
  used_at timestamptz DEFAULT now()
);

-- Add trial_ends_at to photographers
ALTER TABLE photographers ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Insert 5 invite codes (6 months free Pro)
INSERT INTO invite_codes (code, plan, months_free, max_uses) VALUES
  ('FOTO-BETA-A1B2', 'pro', 6, 1),
  ('FOTO-BETA-C3D4', 'pro', 6, 1),
  ('FOTO-BETA-E5F6', 'pro', 6, 1),
  ('FOTO-BETA-G7H8', 'pro', 6, 1),
  ('FOTO-BETA-I9J0', 'pro', 6, 1)
ON CONFLICT (code) DO NOTHING;
