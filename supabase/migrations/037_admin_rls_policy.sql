-- Allow admin user to read all photographers (for admin panel)
-- Admin user ID: 3f3a14b9-3bb2-40fa-b0eb-5fea92f67429

CREATE POLICY "Admin can read all photographers"
  ON photographers
  FOR SELECT
  USING (
    auth.uid() = '3f3a14b9-3bb2-40fa-b0eb-5fea92f67429'::uuid
  );
