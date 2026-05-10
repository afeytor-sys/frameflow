-- Allow free-text client name on offers (when client is not in the clients table)
ALTER TABLE offers ADD COLUMN IF NOT EXISTS client_name text;
